import type { ChoiceOption } from './story';

/** Comic-style question with one button per option, laid over the running film. */
export class ChoicePanel {
  constructor(private readonly host: HTMLElement) {}

  readonly present = (question: string, options: readonly ChoiceOption[]): Promise<number> =>
    new Promise((resolve) => {
      const heading = document.createElement('p');
      heading.className = 'film__question';
      heading.textContent = question;
      const buttons = options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'film__button';
        button.textContent = `${option.icon} ${option.label}`;
        button.addEventListener('click', () => {
          this.clear();
          resolve(index);
        });
        return button;
      });
      const list = document.createElement('div');
      list.className = 'film__options';
      list.append(...buttons);
      this.host.replaceChildren(heading, list);
      this.host.hidden = false;
      buttons[0]?.focus();
    });

  clear(): void {
    this.host.replaceChildren();
    this.host.hidden = true;
  }
}
