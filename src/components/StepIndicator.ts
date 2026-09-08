/**
 * StepIndicator — progress bar + dot connector
 */

export function renderStepIndicator(
  container: HTMLElement,
  currentStep: number,
  totalSteps: number
): void {
  const existing = container.querySelector(".step-indicator-wrapper");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "step-indicator-wrapper";

  const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  // Dots với connector lines
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    const n = i + 1;
    let cls = "step-dot";
    if (n < currentStep) cls += " completed";
    else if (n === currentStep) cls += " active";

    const dot = `<div class="${cls}" title="Bước ${n}"></div>`;
    const connector =
      i < totalSteps - 1
        ? `<div class="step-connector ${n < currentStep ? "done" : ""}"></div>`
        : "";
    return dot + connector;
  }).join("");

  wrapper.innerHTML = `
    <div class="step-progress">
      <div class="step-progress-bar" style="width:${percent}%"></div>
    </div>
    <div class="step-indicator">${dots}</div>
  `;

  container.prepend(wrapper);
}
