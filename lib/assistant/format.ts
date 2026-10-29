// Last-line cleanup of the assistant's reply: raw empty values in markdown tables
// ("| null |", "| **undefined** |") become a dash. Everything else is left to the prompt.
export function cleanReply(reply: string): string {
  return reply.replace(/\|[ \t]*(?:\*\*)?(?:null|undefined|NaN)(?:\*\*)?[ \t]*(?=\|)/gi, "| — ");
}
