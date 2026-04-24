export function sanitizeMatrixTerminalText(value: string): string {
  let withoutAnsi = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x9b) {
      index += 1;
      while (index < value.length && !isAnsiFinalByte(value.charCodeAt(index))) {
        index += 1;
      }
      continue;
    }
    if (code === 0x9d) {
      index += 1;
      while (index < value.length) {
        const current = value.charCodeAt(index);
        if (current === 0x07 || current === 0x9c) {
          break;
        }
        if (current === 0x1b && value[index + 1] === "\\") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (code === 0x90 || code === 0x9e || code === 0x9f) {
      index += 1;
      while (index < value.length) {
        const current = value.charCodeAt(index);
        if (current === 0x07 || current === 0x9c) {
          break;
        }
        if (current === 0x1b && value[index + 1] === "\\") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (code !== 0x1b) {
      withoutAnsi += value[index];
      continue;
    }

    const marker = value[index + 1];
    if (marker === "[") {
      index += 2;
      while (index < value.length && !isAnsiFinalByte(value.charCodeAt(index))) {
        index += 1;
      }
      continue;
    }
    if (marker === "]") {
      index += 2;
      while (index < value.length) {
        const current = value.charCodeAt(index);
        if (current === 0x07) {
          break;
        }
        if (current === 0x1b && value[index + 1] === "\\") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    index += 1;
  }

  let sanitized = "";
  for (const character of withoutAnsi) {
    const code = character.charCodeAt(0);
    if (!isUnsafeMatrixTerminalCode(code)) {
      sanitized += character;
    }
  }
  return sanitized;
}

function isUnsafeMatrixTerminalCode(code: number): boolean {
  return (
    code < 0x20 ||
    code === 0x7f ||
    (code >= 0x80 && code <= 0x9f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

function isAnsiFinalByte(code: number): boolean {
  return code >= 0x40 && code <= 0x7e;
}
