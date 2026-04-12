export function parseInteractiveMessage(text) {
  if (!text) return { type: "text", text: "" };

  const buttonsMatch = text.match(/\[BOTOES\]([\s\S]*?)\[\/BOTOES\]/i);
  if (buttonsMatch) {
    const beforeButtons = text.replace(/\[BOTOES\][\s\S]*?\[\/BOTOES\]/i, "").trim();
    const lines = buttonsMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
    const buttons = lines.map((line, i) => {
      const [displayText, id] = line.split("|").map(s => s.trim());
      return {
        buttonId: id || String(i + 1),
        buttonText: { displayText: displayText || line },
      };
    });
    return {
      type: "buttons",
      text: beforeButtons,
      buttons,
    };
  }

  const listMatch = text.match(/\[LISTA([\s\S]*?)\]\[\/LISTA\]/i);
  if (listMatch) {
    const beforeList = text.replace(/\[LISTA[\s\S]*?\[\/LISTA\]/i, "").trim();
    const listContent = listMatch[1];

    const titleMatch = listContent.match(/titulo=["']([^"']+)["']/i) || listContent.match(/title=["']([^"']+)["']/i);
    const buttonMatch = listContent.match(/botao=["']([^"']+)["']/i) || listContent.match(/button=["']([^"']+)["']/i);

    const title = titleMatch ? titleMatch[1] : "Selecione uma opção";
    const buttonText = buttonMatch ? buttonMatch[1] : "Ver opções";

    const sectionBlocks = listContent.split(/##\s*/).filter(Boolean);
    const sections = [];

    for (const block of sectionBlocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const sectionTitle = lines[0];
      const rows = [];

      for (const line of lines.slice(1)) {
        const dashMatch = line.match(/^-\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)\s*$/);
        if (dashMatch) {
          rows.push({ title: dashMatch[1].trim(), description: dashMatch[2].trim(), rowId: dashMatch[3].trim() });
        } else {
          const pipeMatch = line.match(/^(.+?)\s*\|\s*(.+?)\s*(?:\|(.+))?$/);
          if (pipeMatch) {
            rows.push({ title: pipeMatch[1].trim(), description: pipeMatch[2] ? pipeMatch[2].trim() : "", rowId: pipeMatch[3] ? pipeMatch[3].trim() : pipeMatch[1].trim() });
          } else {
            rows.push({ title: line, description: "", rowId: line });
          }
        }
      }

      if (rows.length > 0) {
        sections.push({ title: sectionTitle, rows });
      }
    }

    if (sections.length === 0) {
      sections.push({ title: "Opções", rows: [{ title: "Opção", description: "", rowId: "1" }] });
    }

    return {
      type: "list",
      text: beforeList,
      title,
      buttonText,
      sections,
    };
  }

  return { type: "text", text };
}
