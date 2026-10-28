"""Give a package from LG's ares-package the owners and modes of upstream's released Helper package.

ares-package 3.2.6 stores every file as 0666 and every folder as 0777, owned by the Mac user, and the TV keeps
those, so any process on the TV could change the installed apps. This rewrites the package in place: owner root,
folders 0755, files 0644, programs 0755, and Helper's two data folders prisoner:jailer 0770 (5999:5000, the owner
Helper's state-permissions.js trusts), exactly as in upstream's com.local.nativehome_0.6.19_arm.ipk.
Based on upstream's scripts/fix-package-data.py (MIT); see helper/LICENSE.

    python3 -I scripts/fix-ipk.py PACKAGE.ipk [...]
"""
import io
import sys
import tarfile

DATA_DIRS = ('usr/palm/applications/com.local.nativehome/state', 'usr/palm/services/com.local.nativehome.service/state')


def read_ar(raw):
    # macOS ar cannot rewrite these Debian-style archives, so read and write them here.
    if raw[:8] != b'!<arch>\n':
        raise SystemExit('not an ipk (ar) archive')
    i, members = 8, []
    while i < len(raw):
        header = raw[i:i + 60]
        size = int(header[48:58])
        members.append([header[:16].decode().strip().rstrip('/'), header, raw[i + 60:i + 60 + size]])
        i += 60 + size + (size & 1)
    return members


def write_ar(members):
    out = bytearray(b'!<arch>\n')
    for _, header, data in members:
        # Owner fields (uid at 28, gid at 34) become 0 as well.
        out += header[:28] + b'0'.ljust(6) + b'0'.ljust(6) + header[40:48] + str(len(data)).ljust(10).encode() + header[58:]
        out += data + (b'\n' if len(data) & 1 else b'')
    return bytes(out)


def fix_tar(raw):
    out, data_dirs = io.BytesIO(), []
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as src, tarfile.open(fileobj=out, mode='w:gz') as dst:
        for entry in src:
            if not (entry.isdir() or entry.isfile()):
                raise SystemExit('unexpected entry type in package: ' + entry.name)
            name = entry.name.rstrip('/')
            if name.startswith('./'):
                name = name[2:]
            # Extended headers can carry the Mac user's name and IDs too; drop those.
            entry.pax_headers = {k: v for k, v in entry.pax_headers.items() if k not in ('uid', 'gid', 'uname', 'gname')}
            if entry.isdir() and name in DATA_DIRS:
                entry.uid, entry.gid, entry.uname, entry.gname, entry.mode = 5999, 5000, 'prisoner', 'jailer', 0o770
                data_dirs.append(name)
            else:
                # Programs are the compiled ones (detach, relay); ares-package also marks appinfo.json executable.
                program = entry.isfile() and src.extractfile(entry).read(4) == b'\x7fELF'
                entry.uid, entry.gid, entry.uname, entry.gname = 0, 0, '', ''
                entry.mode = 0o755 if entry.isdir() or program else 0o644
            dst.addfile(entry, src.extractfile(entry) if entry.isfile() else None)
    return out.getvalue(), data_dirs


def check(members):
    for name, _, data in members:
        if not name.endswith('.tar.gz'):
            continue
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as t:
            for e in t:
                if e.mode & 0o002 or (e.uid, e.gid) not in ((0, 0), (5999, 5000)):
                    raise SystemExit('still unsafe after rewrite: %s %o %d:%d' % (e.name, e.mode, e.uid, e.gid))


for path in sys.argv[1:]:
    members = read_ar(open(path, 'rb').read())
    data_dirs = []
    for member in members:
        if member[0].endswith('.tar.gz'):
            member[2], found = fix_tar(member[2])
            data_dirs += found
    check(members)
    open(path, 'wb').write(write_ar(members))
    print('%s: owner root, folders 0755, files 0644, programs 0755%s' % (
        path, ''.join('; ' + d + ' prisoner:jailer 0770' for d in data_dirs)))
