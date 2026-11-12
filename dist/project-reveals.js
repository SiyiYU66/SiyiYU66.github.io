// The reading view shares one entrance rhythm across legacy stories and case studies.
export function mountProjectReveals({root, scroller, gsap, reducedMotion = false}) {
  if (!root || reducedMotion || !gsap?.timeline || typeof IntersectionObserver === 'undefined') return () => {};

  const styles = new Map();
  const addedClasses = [];
  const windows = [];
  const records = [];
  const animated = new Set();
  let observer = null, disposed = false;

  function remember(element) {
    if (!styles.has(element)) styles.set(element, element.getAttribute('style'));
  }

  function addClass(element, name) {
    if (element.classList.contains(name)) return;
    element.classList.add(name);
    addedClasses.push([element, name]);
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    root.removeEventListener('focusin', onFocus);
    for (const record of records) record.timeline.kill();
    for (const [element, style] of styles) {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    }
    for (const window of windows) {
      if (window.parentNode) window.replaceWith(...window.firstElementChild.childNodes);
    }
    for (const [element, name] of addedClasses) element.classList.remove(name);
  }

  function onFocus(event) {
    for (const record of records) {
      if (!record.done && record.group.contains(event.target)) {
        observer.unobserve(record.group);
        record.timeline.progress(1);
      }
    }
  }

  function addItem(items, element, kind, at = 0) {
    if (!element || animated.has(element)) return;
    animated.add(element);
    remember(element);
    if (kind === 'text') {
      const window = document.createElement('span');
      const text = document.createElement('span');
      window.className = 'project-reveal-window';
      text.className = 'project-reveal-text';
      text.append(...element.childNodes);
      window.append(text);
      element.append(window);
      windows.push(window);
      remember(text);
      items.push({element: text, kind, at});
    } else items.push({element, kind, at});
  }

  function addRule(items, element, at = 0) {
    if (!element) return;
    remember(element);
    addClass(element, 'project-reveal-rule');
    items.push({element, kind: 'rule', at});
  }

  function prepare(group, items) {
    if (!items.length) return;
    const record = {group, done: false, timeline: null};
    const imageClips = items.filter(item => item.kind === 'image').map(({element}) => ({
      element,
      value: element.style.getPropertyValue('clip-path'),
      priority: element.style.getPropertyPriority('clip-path')
    }));
    record.timeline = gsap.timeline({paused: true, onComplete() {
      record.done = true;
      for (const {element, value, priority} of imageClips) {
        if (value) element.style.setProperty('clip-path', value, priority);
        else element.style.removeProperty('clip-path');
      }
    }});
    records.push(record);
    for (const {element, kind, at} of items) {
      if (kind === 'rule') {
        gsap.set(element, {'--project-rule-progress': 0});
        record.timeline.to(element, {'--project-rule-progress': 1, duration: .58, ease: 'power3.out'}, at);
      } else if (kind === 'text') {
        gsap.set(element, {yPercent: 108});
        record.timeline.to(element, {yPercent: 0, duration: .64, ease: 'power3.out'}, at);
      } else if (kind === 'image') {
        gsap.set(element, {opacity: 0, y: 14, scale: .982, clipPath: 'inset(0 0 12% 0)'});
        record.timeline.to(element, {opacity: 1, y: 0, scale: 1, clipPath: 'inset(0 0 0% 0)', duration: .72, ease: 'power3.out'}, at);
      } else {
        gsap.set(element, {opacity: 0, y: 15});
        record.timeline.to(element, {opacity: 1, y: 0, duration: .58, ease: 'power3.out'}, at);
      }
    }
  }

  try {
    addClass(root, 'has-project-reveals');
    for (const group of root.querySelectorAll('.story-heading, .story-section, .case-chapter-heading')) {
      const items = [];
      if (group.matches('.story-section')) addRule(items, group);
      if (group.matches('.case-chapter-heading')) addRule(items, group.parentElement);
      const label = group.querySelector(':scope > .micro, :scope > .case-label');
      addItem(items, label, 'text', .02);
      addItem(items, group.querySelector(':scope > h2, :scope > h3'), 'text', .09);
      prepare(group, items);
      for (const paragraph of group.querySelectorAll(':scope > p')) {
        const paragraphItems = [];
        addItem(paragraphItems, paragraph, 'copy', .08);
        prepare(paragraph, paragraphItems);
      }
    }

    for (const group of root.querySelectorAll('.case-chapter-copy')) {
      for (const element of group.querySelectorAll(':scope > p, .case-notes > div, .case-results, .case-acknowledgements > h4, .case-acknowledgements li')) {
        const items = [];
        if (element.matches('.case-notes > div')) addRule(items, element);
        addItem(items, element, 'copy', .04);
        prepare(element, items);
      }
    }

    for (const figure of root.querySelectorAll('.case-gallery > .case-figure')) {
      const items = [];
      addItem(items, figure.querySelector('.case-figure-link'), 'image');
      addItem(items, figure.querySelector('figcaption'), 'copy', .12);
      prepare(figure, items);
    }

    for (const group of root.querySelectorAll('.pid-equation, .pid-term, .pid-tuning-copy, .pid-rate-note')) {
      const items = [];
      addItem(items, group, 'copy', .04);
      prepare(group, items);
    }
    for (const figure of root.querySelectorAll('.pid-tuning > .case-figure')) {
      const items = [];
      addItem(items, figure.querySelector('.case-figure-link'), 'image');
      addItem(items, figure.querySelector('figcaption'), 'copy', .12);
      prepare(figure, items);
    }

    for (const group of root.querySelectorAll('.case-reel')) {
      const items = [];
      addItem(items, group.querySelector('.case-reel-controls'), 'copy');
      addItem(items, group.querySelector('.case-reel-viewport'), 'image', .06);
      prepare(group, items);
    }

    for (const group of root.querySelectorAll('.case-resources')) {
      const items = [];
      addRule(items, group);
      addItem(items, group.querySelector(':scope > .case-label'), 'text', .02);
      group.querySelectorAll('.case-resource').forEach((link, index) => addItem(items, link, 'copy', .10 + index * .07));
      prepare(group, items);
    }

    const pending = new Map(records.map(record => [record.group, record]));
    observer = new IntersectionObserver(entries => {
      if (disposed) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const record = pending.get(entry.target);
        if (!record) continue;
        pending.delete(entry.target);
        observer.unobserve(entry.target);
        record.timeline.play(0);
      }
    }, {root: scroller, rootMargin: '0px 0px -48px 0px', threshold: .01});
    for (const record of records) observer.observe(record.group);
    root.addEventListener('focusin', onFocus);
    return cleanup;
  } catch (error) {
    cleanup();
    console.warn('Project reveal unavailable', error);
    return () => {};
  }
}
