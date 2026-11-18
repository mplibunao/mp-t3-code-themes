// The made-up T3 Code window. It copies the nesting, data attributes, and button labels that theme
// CSS keys off, from T3 Code's apps/web/src/components/ChatView.tsx, chat/ChatComposer.tsx,
// chat/ComposerSurface.tsx, chat/ComposerBanner.tsx, and chat/MessagesTimeline.tsx, so a theme's
// selectors match here the way they match in the app. The conversation is invented.

const IDLE_LABEL = "Submit message";
const RUN_LABEL = "Stop generation";
// T3 Code pads the end of the timeline by the composer's height, so the last row clears the
// composer. The extra room keeps that row clear of art a theme draws on the composer's top edge.
const STAGE_CLEARANCE_PX = 64;

const ICON_READ = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10.5 3 13 5.5 6 12.5H3.5V10Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const ICON_RUN = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m3 4.5 3.5 3.5L3 11.5M8.5 11.5H13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const APP_MARKUP = `
<div class="mock-app">
  <aside class="mock-sidebar" aria-label="Threads">
    <span class="mock-new-thread">New thread</span>
    <p class="mock-project">garden-planner</p>
    <ul class="mock-threads">
      <li data-thread-item><a class="mock-thread" aria-current="page">Fix duplicate watering reminders</a></li>
      <li data-thread-item><a class="mock-thread">Add frost warnings</a></li>
      <li data-thread-item><a class="mock-thread">Plant photo uploads</a></li>
      <li data-thread-item><a class="mock-thread">Weekly summary email</a></li>
    </ul>
  </aside>
  <div class="mock-chat" data-chat-column>
    <header class="mock-chat-header" data-chat-header>
      <h2 class="mock-thread-title">Fix duplicate watering reminders</h2>
      <span class="mock-project-chip">garden-planner</span>
      <span class="mock-capture-label">Independent mock-up</span>
    </header>
    <div class="mock-workspace" data-chat-canvas>
      <div class="mock-conversation" data-workspace-area="conversation">
        <div class="messages-timeline-scroll">
          <div data-timeline-row-kind="message" data-message-role="user">
            <div class="chat-content-lane mock-user-lane">
              <div class="mock-message" data-user-message-bubble>Watering reminders show up twice for plants that have two schedules. Can you find out why and fix it?</div>
            </div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane mock-message"><p>I'll read how reminders get scheduled first, then write a failing test before I change anything.</p></div>
          </div>
          <div data-timeline-row-kind="work">
            <div class="chat-content-lane mock-work">${ICON_READ}<span>Read 4 files</span><time>9:41 AM</time></div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane mock-message"><p>The scheduler makes one reminder per schedule and never merges the ones that fall on the same day. This keeps one reminder per plant per day:</p></div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane"><pre class="mock-code"><code>const reminders = schedules
  .flatMap((schedule) => nextDates(schedule, today))
  .filter(firstPerDay);</code></pre></div>
          </div>
          <div data-timeline-row-kind="work">
            <div class="chat-content-lane mock-work">${ICON_RUN}<span>Ran the test suite</span><time>9:43 AM</time></div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane mock-message"><p>The new test failed before the change and passes now. Plants with a single schedule get the same reminders as before, and two schedules on different days still give two reminders, one on each day.</p></div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="user">
            <div class="chat-content-lane mock-user-lane">
              <div class="mock-message" data-user-message-bubble>Nice. Does the weekly summary have the same problem?</div>
            </div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane mock-message"><p>Yes. It counts schedules instead of reminders, so a plant with two schedules shows up twice there too. The same filter fixes it, and the summary gets its own test.</p></div>
          </div>
          <div data-timeline-row-kind="work">
            <div class="chat-content-lane mock-work">${ICON_EDIT}<span>Edited 2 files</span><time>9:46 AM</time></div>
          </div>
          <div data-timeline-row-kind="message" data-message-role="assistant">
            <div class="chat-content-lane mock-message"><p>Both lists now show each plant once a day. Open the weekly summary to check it against your own garden.</p></div>
          </div>
        </div>
      </div>
      <div class="mock-composer-overlay" data-workspace-area="composer" data-chat-composer-overlay="true">
        <div class="chat-composer-lane">
          <div data-chat-composer-stack="true">
            <div class="mock-stack-anchor">
              <div class="mock-shell-frame">
                <div data-slot="composer-shell" data-context-row="true">
                  <div data-slot="composer-host">
                    <div class="mock-form-anchor">
                      <form data-chat-composer-form="true" aria-label="Message composer">
                        <div class="mock-card-frame">
                          <div data-chat-composer-main-surface="true">
                            <div data-chat-composer-surface="true">
                              <div class="composer-tiptap" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message" data-placeholder="Ask anything" spellcheck="false"></div>
                              <div class="mock-composer-footer">
                                <div class="mock-composer-tools">
                                  <button type="button" class="mock-tool mock-tool-icon" aria-label="Attach files"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
                                  <button type="button" class="mock-tool">Default model</button>
                                  <button type="button" class="mock-tool">High</button>
                                </div>
                                <button type="submit" class="mock-primary-action" aria-label="${IDLE_LABEL}" title="${IDLE_LABEL}">
                                  <svg class="mock-icon-send" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                  <svg class="mock-icon-stop" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" fill="currentColor"/></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                  <div data-slot="composer-context-strip">
                    <span class="mock-context-chip">Local</span>
                    <span class="mock-context-chip">main</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

// A live row only exists while a run lasts, as in T3 Code's timeline.
const LIVE_ROW_MARKUP = `
<div data-timeline-row-kind="working">
  <div class="chat-content-lane mock-live"><span class="mock-live-dot" aria-hidden="true"></span>Working</div>
</div>`;

// The drawer only exists while a question waits for an answer. It's inset from the card's sides and
// tucks its bottom edge under the card.
const DRAWER_MARKUP = `
<div class="mock-drawer-dock" data-slot="composer-banner-attachment">
  <div class="mock-drawer" data-slot="composer-banner" data-composer-banner-surface="attached" data-chat-composer-top-drawer="true">
    <p class="mock-drawer-meta">Question 1 of 1</p>
    <p class="mock-drawer-question">Two schedules land on the same morning. Which reminder time should stay?</p>
    <div class="mock-drawer-options">
      <button type="button" class="mock-drawer-option">The earlier one</button>
      <button type="button" class="mock-drawer-option">The later one</button>
    </div>
  </div>
</div>`;

/** The made-up window, and the markers that the demo's states change. */
export interface Mockup {
  readonly form: HTMLFormElement;
  readonly editor: HTMLElement;
  /**
   * Sets the run markers: a live `working` row in the timeline and the Stop generation label on the
   * primary action, and the question drawer above the card. Unchanged markers stay in place.
   */
  readonly setMarkers: (markers: { readonly working: boolean; readonly drawer: boolean }) => void;
}

/**
 * Finds one element of the page.
 *
 * @param root - Where to look.
 * @param selector - A selector that the page's markup always matches.
 * @param type - The element's class.
 * @returns The element. Throws when it's missing or of another type, which is a defect of the page.
 */
export const requireElement = <T extends Element>(
  root: ParentNode,
  selector: string,
  type: new () => T,
): T => {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new TypeError(`The page has no ${type.name} matching ${selector}.`);
  }
  return element;
};

const fromMarkup = (markup: string): Element => {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const element = template.content.firstElementChild;
  if (element === null) {
    throw new TypeError("The markup is empty.");
  }
  return element;
};

const findParts = (root: ParentNode) => ({
  form: requireElement(root, "[data-chat-composer-form]", HTMLFormElement),
  editor: requireElement(root, ".composer-tiptap", HTMLElement),
  action: requireElement(root, ".mock-primary-action", HTMLButtonElement),
  conversation: requireElement(root, "[data-workspace-area='conversation']", HTMLElement),
  scroller: requireElement(root, ".messages-timeline-scroll", HTMLElement),
  overlay: requireElement(root, "[data-chat-composer-overlay]", HTMLElement),
  cardFrame: requireElement(root, ".mock-card-frame", HTMLElement),
});

type Parts = ReturnType<typeof findParts>;

const scrollToEnd = (scroller: HTMLElement): void => {
  scroller.scrollTop = scroller.scrollHeight;
};

// The timeline keeps its end in view as the composer grows: a typed line, or the drawer.
const followOverlay = ({ overlay, conversation, scroller }: Parts): void => {
  new ResizeObserver(() => {
    const clearance = overlay.offsetHeight + STAGE_CLEARANCE_PX;
    conversation.style.setProperty("--composer-clearance", `${clearance}px`);
    scrollToEnd(scroller);
  }).observe(overlay);
};

const setRunLabel = (action: HTMLButtonElement, working: boolean): void => {
  const label = working ? RUN_LABEL : IDLE_LABEL;
  action.setAttribute("aria-label", label);
  action.title = label;
  action.dataset["running"] = String(working);
};

const toggle = (element: Element, present: boolean, insert: () => void): void => {
  if (present && !element.isConnected) {
    insert();
  } else if (!present) {
    element.remove();
  }
};

/**
 * Builds the made-up window inside `container`, once. Its form never submits.
 *
 * @param container - The element that holds the window.
 * @returns The window's focus targets and its marker switch.
 */
export const buildMockup = (container: HTMLElement): Mockup => {
  container.replaceChildren(fromMarkup(APP_MARKUP));
  const parts = findParts(container);
  const liveRow = fromMarkup(LIVE_ROW_MARKUP);
  const drawer = fromMarkup(DRAWER_MARKUP);
  parts.form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  followOverlay(parts);
  return {
    form: parts.form,
    editor: parts.editor,
    setMarkers: ({ working, drawer: open }) => {
      toggle(liveRow, working, () => parts.scroller.append(liveRow));
      setRunLabel(parts.action, working);
      toggle(drawer, open, () => parts.cardFrame.before(drawer));
      scrollToEnd(parts.scroller);
    },
  };
};
