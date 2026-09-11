import app from './api/index.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Servidor Proxy CapIAu-CurIA rodando em:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Suporta: Google AI Studio (direto) + OpenRouter (fallback)`);
  console.log(`==================================================\n`);
});
