/**
 * Valida um número de CPF brasileiro.
 * @param {string|number} cpf - O CPF a ser validado. Pode conter pontos e traços ou apenas dígitos.
 * @returns {boolean} true se o CPF for válido, false caso contrário.
 */
function isValidCPF(cpf) {
  if (cpf === null || cpf === undefined) {
    return false;
  }

  // Converte para string para garantir consistência no processamento
  const cpfString = String(cpf);

  // Remove qualquer caractere que não seja dígito
  const cleanedCpf = cpfString.replace(/\D/g, '');

  // Verifica se tem exatamente 11 dígitos
  if (cleanedCpf.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (ex: 00000000000, 11111111111)
  // Esses casos passam na soma matemática mas são inválidos por definição
  if (/^(\d)\1*$/.test(cleanedCpf)) {
    return false;
  }

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanedCpf.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }

  // Compara com o décimo dígito
  if (remainder !== parseInt(cleanedCpf.charAt(9), 10)) {
    return false;
  }

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanedCpf.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }

  // Compara com o décimo primeiro dígito
  if (remainder !== parseInt(cleanedCpf.charAt(10), 10)) {
    return false;
  }

  return true;
}

module.exports = { isValidCPF };