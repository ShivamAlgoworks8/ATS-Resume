const fs = require('fs');

function splice(path, startNeedle, endNeedle, replacement) {
  const source = fs.readFileSync(path, 'utf8');
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start < 0 || end < 0) {
    throw new Error(`missing marker in ${path} start=${start} end=${end}`);
  }
  const next = source.slice(0, start) + replacement + source.slice(end + endNeedle.length);
  fs.writeFileSync(path, next);
  console.log('updated', path);
}

splice(
  'src/app/pages/workflow/step-studio/step-studio.component.html',
  '          <article',
  '          </article>',
  `          <article class="latex-paper-sheet template-algoworks" aria-label="Live Resume Preview">
            <app-algoworks-resume [resume]="state.editableStructured()" [fallbackTitle]="state.jobTitle()" />
          </article>`
);

splice(
  'src/app/pages/workflow/step-preview/step-preview.component.html',
  '  <!-- Template Selector Cards -->',
  '    </article>',
  `  <div class="latex-paper-container">
    <article class="latex-paper-sheet template-algoworks" aria-label="ATS Resume Preview">
      <app-algoworks-resume [resume]="state.editableStructured()" [fallbackTitle]="state.jobTitle()" />
    </article>
  </div>
</div>`
);
