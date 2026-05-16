# /commit — Inspect changes and commit (single or split)

Run this workflow. Your responsibility is to **see the changes**, decide if they belong in **one commit** or **several**, then commit accordingly. **Every commit message must include an emoji.**

## 1. Inspect what changed

- Run `git status` to see modified, added, and deleted files.
- Run `git diff --stat` (and optionally `git diff` for key files) to understand the **scope and intent** of each change.
- If nothing is staged and there are changes, you will stage selectively per commit (see below); do not blindly `git add -A` until you've decided how to split.

## 2. Decide: one commit or multiple?

- **Single commit** when changes are one logical unit, e.g.:
  - One feature across several files
  - One fix and its tests/docs
  - One refactor or chore touching related code only
- **Multiple commits** when changes are unrelated, e.g.:
  - A fix in `auth/` and a new feature in `video/`
  - Separate fixes, chores, or docs that don't depend on each other
  - Mix of `fix:`, `feat:`, `chore:`, `docs:` that clearly belong to different concerns

If you split, assign each set of files to a distinct commit and stage/commit in order (e.g. fix first, then feat).

## 3. Commit message style (every commit)

- **Conventional type**: use the **exact type** that matches the change from the Conventional types reference below.
- **Always add an emoji** in the subject (after the type, before the description). **Pick the emoji that best matches the change** from the Gitmoji reference below.
- **Lowercase** after the type; short, clear description.
- **Body**: optional second line with more detail.
- **Optional PR reference** at the end when relevant, e.g. `(#99)`.
- Examples: `feat: ✨ Add db level logs for drizzle queries`, `fix: 🐛 Specify the test container db version to match prod (#70)`.

### Conventional types reference

| Type | Title | Description |
|------|-------|-------------|
| `feat` | Features | A new feature |
| `fix` | Bug Fixes | A bug fix |
| `docs` | Documentation | Documentation only changes |
| `style` | Styles | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc) |
| `refactor` | Code Refactoring | A code change that neither fixes a bug nor adds a feature |
| `perf` | Performance Improvements | A code change that improves performance |
| `test` | Tests | Adding missing tests or correcting existing tests |
| `build` | Builds | Changes that affect the build system or external dependencies (e.g. gulp, broccoli, npm) |
| `ci` | Continuous Integrations | Changes to CI configuration files and scripts (e.g. Travis, Circle, BrowserStack, SauceLabs) |
| `chore` | Chores | Other changes that don't modify src or test files |
| `revert` | Reverts | Reverts a previous commit |

### Gitmoji reference

| Emoji | Code | Description |
|-------|------|-------------|
| 🎨 | `:art:` | Improving structure / format of the code. |
| ⚡️ | `:zap:` | Improving performance. |
| 🔥 | `:fire:` | Removing code or files. |
| 🐛 | `:bug:` | Fixing a bug. |
| 🚑 | `:ambulance:` | Critical hotfix. |
| ✨ | `:sparkles:` | Introducing new features. |
| 📝 | `:pencil:` | Writing docs. |
| 🚀 | `:rocket:` | Deploying stuff. |
| 💄 | `:lipstick:` | Updating the UI and style files. |
| 🎉 | `:tada:` | Initial commit. |
| ✅ | `:white_check_mark:` | Updating tests. |
| 🔒 | `:lock:` | Fixing security issues. |
| 🍎 | `:apple:` | Fixing something on macOS. |
| 🐧 | `:penguin:` | Fixing something on Linux. |
| 🏁 | `:checkered_flag:` | Fixing something on Windows. |
| 🤖 | `:robot:` | Fixing something on Android. |
| 🍏 | `:green_apple:` | Fixing something on iOS. |
| 🔖 | `:bookmark:` | Releasing / Version tags. |
| 🚨 | `:rotating_light:` | Removing linter warnings. |
| 🚧 | `:construction:` | Work in progress. |
| 💚 | `:green_heart:` | Fixing CI Build. |
| ⬇️ | `:arrow_down:` | Downgrading dependencies. |
| ⬆️ | `:arrow_up:` | Upgrading dependencies. |
| 📌 | `:pushpin:` | Pinning dependencies to specific versions. |
| 👷 | `:construction_worker:` | Adding CI build system. |
| 📈 | `:chart_with_upwards_trend:` | Adding analytics or tracking code. |
| ♻️ | `:recycle:` | Refactoring code. |
| 🐳 | `:whale:` | Work about Docker. |
| ➕ | `:heavy_plus_sign:` | Adding a dependency. |
| ➖ | `:heavy_minus_sign:` | Removing a dependency. |
| 🔧 | `:wrench:` | Changing configuration files. |
| 🌐 | `:globe_with_meridians:` | Internationalization and localization. |
| ✏️ | `:pencil2:` | Fixing typos. |
| 💩 | `:poop:` | Writing bad code that needs to be improved. |
| ⏪ | `:rewind:` | Reverting changes. |
| 🔀 | `:twisted_rightwards_arrows:` | Merging branches. |
| 📦 | `:package:` | Updating compiled files or packages. |
| 👽 | `:alien:` | Updating code due to external API changes. |
| 🚚 | `:truck:` | Moving or renaming files. |
| 📄 | `:page_facing_up:` | Adding or updating license. |
| 💥 | `:boom:` | Introducing breaking changes. |
| 🍱 | `:bento:` | Adding or updating assets. |
| 👌 | `:ok_hand:` | Updating code due to code review changes. |
| ♿️ | `:wheelchair:` | Improving accessibility. |
| 💡 | `:bulb:` | Documenting source code. |
| 🍻 | `:beers:` | Writing code drunkenly. |
| 💬 | `:speech_balloon:` | Updating text and literals. |
| 🗃 | `:card_file_box:` | Performing database related changes. |
| 🔊 | `:loud_sound:` | Adding logs. |
| 🔇 | `:mute:` | Removing logs. |
| 👥 | `:busts_in_silhouette:` | Adding contributor(s). |
| 🚸 | `:children_crossing:` | Improving user experience / usability. |
| 🏗 | `:building_construction:` | Making architectural changes. |
| 📱 | `:iphone:` | Working on responsive design. |
| 🤡 | `:clown_face:` | Mocking things. |
| 🥚 | `:egg:` | Adding an easter egg. |
| 🙈 | `:see_no_evil:` | Adding or updating a .gitignore file. |
| 📸 | `:camera_flash:` | Adding or updating snapshots. |
| ⚗ | `:alembic:` | Experimenting new things. |
| 🔍 | `:mag:` | Improving SEO. |
| ☸️ | `:wheel_of_dharma:` | Work about Kubernetes. |
| 🏷️ | `:label:` | Adding or updating types (Flow, TypeScript). |

## 4. Execute

- **One commit**: stage the needed files (or all if everything is one change), then run `git commit -m "type: emoji description"`.
- **Multiple commits**: for each logical group, run `git add <paths>`, then `git commit -m "type: emoji description"`. Repeat until all changes are committed.

If there are no changes at all, say so and stop.
