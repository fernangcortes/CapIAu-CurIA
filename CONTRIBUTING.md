# Guia de Contribuição — CapIAu-CurIA

Bem-vindo ao projeto **CapIAu-CurIA**! Este repositório foi estruturado para suportar o desenvolvimento colaborativo de alto desempenho, unindo desenvolvedores humanos e agentes de Inteligência Artificial (IAs).

Para garantir a estabilidade técnica, o rigor de tipagem e a confiabilidade das consultas em produção, siga rigorosamente as diretrizes abaixo.

---

## 🤖 1. Diretrizes para Agentes de IA

Como um agente autônomo de IA (ou assistente de codificação), você deve seguir estas regras sem exceção:

### A. Sem Alucinação ou Simulação Procedural
* **É expressamente proibido criar dados fictícios, mockados ou simulados offline (o antigo modo "fail-safe")** quando houver falhas de API.
* Se as APIs de busca estiverem fora do ar ou o limite de requisições for atingido, o sistema **deve** reportar o erro técnico real ou usar outras APIs de busca reais configuradas como fallback. Nunca gere dados de especificações ou preços proceduralmente no backend ou frontend.

### B. Mapeamento e Preservação de Links Reais
* Ao processar respostas dos LLMs estruturadas em JSON ou texto que incluam links de compras e manuais:
  1. Extraia e substitua as URLs reais por tokens temporários (`LINK_X`, `THUMB_X`) antes de enviar a consulta ao LLM.
  2. Reinsira as URLs reais nos locais correspondentes após o retorno do LLM.
  3. Isso evita que o modelo alucine URLs quebradas ou links apontando para `localhost`.

### C. Manutenção da Integridade do Código
* **Preserve os comentários e docstrings existentes** no código que não forem o foco direto da sua modificação.
* Siga as tipagens TypeScript rígidas declaradas em [apiRouter.ts](src/services/apiRouter.ts) e nos demais arquivos.

---

## 🧑‍💻 2. Diretrizes para Contribuidores Humanos

Se você é um desenvolvedor humano trabalhando no CapIAu-CurIA, siga estes padrões:

### A. Commits Semânticos
Adotamos o padrão de commits convencionais (Conventional Commits):
* `feat:` Novas funcionalidades (ex: Sidebar, Super Menu).
* `fix:` Correções de bugs (ex: timeout de chat, links alucinados).
* `docs:` Alterações na documentação (ex: README, CONTRIBUTING).
* `style:` Formatação de código e estilos CSS/TSX sem alteração lógica.
* `refactor:` Alterações de código que não corrigem bug nem adicionam funcionalidade.
* `chore:` Tarefas de manutenção ou atualização de pacotes.

### B. Fluxo de Trabalho (Git Workflow)
1. Crie uma branch a partir da `main` (ex: `feature/nova-aba-sidebar` ou `bugfix/timeout-conexao`).
2. Faça as modificações e execute testes locais (`npm run lint` e `npm run build`).
3. Envie suas alterações e abra um Pull Request detalhado explicando as mudanças e como testá-las.

---

## 🛠️ 3. Padrões de Qualidade de Código (Linting & Build)

Tanto humanos quanto IAs devem certificar-se de que o código passa nas validações locais antes de qualquer commit/push:

```bash
# Executa a validação de tipo do TypeScript e a compilação do Vite
npm run build

# Executa o Linter (ESLint) para garantir a consistência de formatação
npm run lint
```
