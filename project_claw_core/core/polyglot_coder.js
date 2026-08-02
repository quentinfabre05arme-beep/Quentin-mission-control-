function runPython(code, file) {
  return { language: 'python', file, codeLength: code.length };
}
function runJS(code, file) {
  return { language: 'javascript', file, codeLength: code.length };
}

module.exports = { runPython, runJS };