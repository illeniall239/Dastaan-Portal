// Last-line cleanup of the assistant's reply. Everything else is left to the prompt.
// - raw empty values in markdown tables ("| null |", "| **undefined** |") become a dash
// - table separator cells padded with long runs of dashes ("| :-------------… |") are cut to "---";
//   the model sometimes pads them until it runs out of tokens
// - a separator row glued onto the end of the header row is moved to its own line, so the table renders
export function cleanReply(reply: string): string {
  return reply
    .split("\n")
    .map((line) => {
      if (!line.includes("|")) return line;
      return line
        .replace(/(:?)-{4,}(:?)/g, "$1---$2")
        .replace(/\|[ \t]+(?=\|[ \t]*:?---:?[ \t]*\|)/, "|\n")
        .replace(/\|[ \t]*(?:\*\*)?(?:null|undefined|NaN)(?:\*\*)?[ \t]*(?=\|)/gi, "| — ");
    })
    .join("\n");
}
