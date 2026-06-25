const Dropdown = (() => {
  const open = new Set();

  function closeAll(except) {
    open.forEach((d) => {
      if (d === except) return;
      d.classList.remove("is-open");
      d.querySelector(".dropdown__trigger").setAttribute("aria-expanded", "false");
      open.delete(d);
    });
  }

  // root: .dropdown element. items: [{value,label}]. onChange(value,label).
  function create(root, items, onChange, initialValue) {
    const trigger = root.querySelector(".dropdown__trigger");
    const panel = root.querySelector(".dropdown__panel");
    const current = root.querySelector(".dropdown__current");
    let value = initialValue != null ? initialValue : (root.dataset.value || "");

    function paint() {
      let html = "";
      for (const it of items) {
        const sel = it.value === value ? " is-sel" : "";
        html += `<div class="dropdown__opt${sel}" role="option" data-value="${it.value}" aria-selected="${it.value === value}">${it.label}</div>`;
      }
      panel.innerHTML = html;
      const match = items.find((i) => i.value === value);
      if (current && match) current.textContent = match.label;
    }
    paint();

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !root.classList.contains("is-open");
      closeAll(root);
      root.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) open.add(root); else open.delete(root);
    });

    panel.addEventListener("click", (e) => {
      e.stopPropagation();
      const opt = e.target.closest(".dropdown__opt");
      if (!opt) return;
      value = opt.dataset.value;
      root.dataset.value = value;
      paint();
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      open.delete(root);
      if (onChange) onChange(value, opt.textContent);
    });

    return {
      setItems(next) { items = next; paint(); },
      get value() { return value; },
      set value(v) { value = v; root.dataset.value = v; paint(); },
    };
  }

  document.addEventListener("click", () => closeAll(null));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(null); });

  return { create };
})();
