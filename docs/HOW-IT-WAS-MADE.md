# How Ambient Home was made

Ambient Home was built in a few evenings of conversation with Claude Code, Anthropic's coding agent, not from one magic prompt. The AI did the research, wrote the code, previewed it in a browser and tested it on the TV over LG's Developer Mode; the person chose the direction, tried it with the remote and asked for changes. Below are the real prompts in order, lightly edited for typos, with personal details replaced by [brackets].

## The prompts, in order

### 1. Research
1. "https://github.com/Gathin23/cleanyourtv Found this repo and it's trending. I want to customise my TV, which is an LG OLED running webOS. I couldn't find my TV model in the repo to check the steps. If there are steps, let me know, or can we build something like that which is really customisable in a creative way with no lag?"
2. "I have an [LG OLED model]."
3. "Create a folder for now and add your investigation."
4. "Make it a private git repo until we make it live."

### 2. Choosing a direction
1. "Here is the document we investigated. Check the files inside, check the private git repo exists, and we start once you check."
2. "Is there a way to customise that download? I don't want to use the author's default package, as I'm not sure what's in it, and I don't want to root my TV either."
3. "I should have an option to switch back to LG webOS anytime."
4. "Can you build it and show how my TV would look, so I can suggest UI improvements?"
5. "What's the root and non-root edition? Is there a way to make it more interactive, with a better UI?"
- Then a few choices from Claude's multiple-choice questions: the "Ambient" style (a full-screen wallpaper that follows the time and weather, a big clock, an app row), an OLED-safe idle screen, an IPTV tile and a PS5 tile that switches to its HDMI input.

### 3. Making it beautiful
1. "Can you make it a little creative?"
2. "I like it. Now change the app icons in a creative way."
3. "Will it also have a snow effect?"
4. "Yes, make winter snowier, with snow on the icons."

### 4. On the TV
1. "I love it. You can commit. How do we test it on the TV?"
2. "[TV's IP address]", then "done" after typing the Developer Mode passphrase in the terminal.
3. "Yes, start the performance pass."
4. "Commit it. And how do we use it? YouTube won't open, nor the apps that are installed."
5. "[my IPTV app] is the one. Commit it."

### 5. The Home button
1. "Start now." (Make the remote's Home button open Ambient Home, with every way back to LG Home.)
2. "I am at the TV."
3. "It's good for now."

### 6. Going public
1. "Make a good, creative, colourful README and make it public, and make sure none of the sensitive information, like location, model, email, name or account, is in the repo."

### 7. After sharing it on Reddit
1. "People suggested a weekly weather forecast, or at least the next few days; splitting the dynamic wallpaper out as a separate app; and someone asked for the prompt."

## One prompt to start from

If you want to try something similar, this single prompt sums up the goals and the rules that mattered. Expect to follow up with short requests like the ones above.

```text
I have an LG webOS TV with Developer Mode on. Build me a custom home screen as a webOS web app that I install myself
with LG's ares command-line tools.

Style: a full-screen living wallpaper (a lakeside with mountains, pines, a cabin and a lake that reflects them) that
follows the real sunrise and sunset, the moon's phase, the weather (Open-Meteo, no account) and the season. A big clock
and date, the current weather and the next few days' forecast, frosted-glass app icons resting on the lake, a row of
HDMI inputs, and an OLED-safe idle clock.

Performance first: it must stay smooth on a TV's graphics chip. Use a fixed 1920x1080 canvas and ES5, animate only
transform and opacity, avoid blur and full-screen overlay layers, measure the frame rate on the TV and lower the
quality automatically when needed.

Open the TV's real apps and inputs from the tiles. Read the installed apps from my computer over LG's local
remote-control service with read-only permissions.

Make the remote's Home button open it without rooting the TV. Build any helper from reviewed source, never from prebuilt
packages, and keep easy ways back to LG Home: hold Back, press Home three times, a switch in settings, and a script.

Keep my personal details out of git. Work in small steps, give me a preview I can open in a browser, and test each step
before moving on.
```

## Tips
- Ask for a browser preview first. It is much faster to try ideas there than on the TV.
- Measure on the real TV. The TV's graphics chip was the real limit, and the performance pass made the biggest difference.
- Be clear about your rules early. "No prebuilt packages", "no root" and "always a way back to LG Home" shaped the whole project.
- Short follow-ups work well. Most of the polish came from one-line requests like "make it a little creative".
