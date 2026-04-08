# Jeferson Personal — v10 estável

Aplicativo web mobile-first em Framework7, HTML, CSS e JavaScript puro, com persistência local em IndexedDB e funcionamento como site estático.

## Visão geral da arquitetura

O projeto está dividido em camadas simples:

- `index.html`: shell principal do app
- `pages/`: páginas HTML carregadas por rota
- `css/`: tokens visuais e estilos globais
- `js/app.js`: bootstrap do app
- `js/routes.js`: rotas do Framework7
- `js/db/`: IndexedDB, repositório e seed inicial
- `js/modules/`: funcionalidades por domínio
- `js/utils/`: constantes e formatadores
- `assets/`: ícones e imagens

## Estrutura de pastas

```text
index.html
manifest.json
service-worker.js
css/
js/
  db/
  modules/
  utils/
pages/
assets/
```

## Como abrir e rodar

### Opção 1 — Python

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

### Opção 2 — VS Code

Pode usar Live Server.

## Importante ao testar versões novas

Se você já abriu versões anteriores deste projeto, limpe o navegador antes de testar:

1. DevTools → Aplicativo / Application
2. Service Workers → Unregister
3. Storage / Armazenamento → Clear site data
4. Recarregue com `Ctrl + F5`

Na v10, o service worker **não é registrado em localhost**, justamente para evitar cache antigo durante desenvolvimento.

## Como o PWA funciona

- `manifest.json` define nome, ícones, tema e modo standalone
- `service-worker.js` está preparado para uso em ambiente publicado
- em `localhost`, o service worker fica desativado para reduzir problemas de cache durante testes

## Como o IndexedDB foi organizado

Banco: `jeferson-personal-db`

Stores principais:

- `students`
- `gyms`
- `exercises`
- `schedules`
- `workoutTemplates`
- `workoutLogs`
- `settings`

Há uma camada reutilizável em `js/db/repository.js` com funções para:

- adicionar
- editar
- remover
- buscar por id
- listar todos
- filtrar
- limpar store

## Principais fluxos do usuário

### Dashboard do dia
- usa dia e hora atuais do dispositivo
- separa próximos treinos e quem já treinou
- agrupa por horário
- abre detalhes do horário

### Alunos
- criar, editar, excluir, inativar e reativar
- histórico individual
- acesso aos treinos do aluno

### Academias
- criar, editar e excluir
- busca por nome

### Exercícios
- criar, editar e excluir
- busca por nome
- filtro por grupo muscular

### Agenda
- agenda recorrente por dia da semana
- alerta para conflito de horário
- suporte a múltiplos alunos no mesmo horário

### Treino do dia
- mostra todos os alunos do horário
- permite editar cargas
- permite concluir treino
- grava log no IndexedDB
- gera resumo para WhatsApp

### Configurações
- exportação de backup JSON
- importação de backup JSON
- exportação CSV de alunos
- exportação CSV de academias

## Checklist técnico revisado na v10

### Estrutura e carregamento
- [x] Todos os arquivos JavaScript passaram em verificação de sintaxe
- [x] Imports locais principais revisados
- [x] Shell inicial do app carrega sem depender de backend
- [x] Bootstrap reorganizado para inicializar IndexedDB antes da renderização principal
- [x] Fallback fatal amigável quando houver erro crítico

### Persistência
- [x] Inicialização do IndexedDB revisada
- [x] Seed inicial mantido
- [x] Stores principais revisadas

### Fluxos funcionais revisados no código
- [x] Dashboard do dia
- [x] CRUD de alunos
- [x] CRUD de academias
- [x] CRUD de exercícios
- [x] Agenda recorrente
- [x] Horários simultâneos
- [x] Detalhe do horário
- [x] Histórico do aluno
- [x] Backup e restauração
- [x] Modelos de treino por aluno e dia da semana

### Estabilidade de desenvolvimento
- [x] Service worker desativado em localhost
- [x] Mensagens de erro globais registradas no console
- [x] Re-renderização inicial reforçada no Framework7

## Sugestões reais de próximas evoluções

- construtor visual mais avançado para ficha de treino
- duplicar treino de um dia para outro
- reordenar exercícios por drag and drop
- filtros por período no histórico
- exportação do histórico por aluno
- sincronização futura em nuvem
- versão totalmente offline sem CDN

## Limitações atuais

- a biblioteca Framework7 ainda vem de CDN
- não há testes automatizados
- não há sincronização entre dispositivos
- o backup atual faz restauração por sobrescrita total
