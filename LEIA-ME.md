# Rezaí — rotina de oração (PWA offline)

Checklist de práticas devocionais, metas diárias, sequência de perseverança, calendário e estatísticas.
Sem contas, sem servidor, sem rastreamento: tudo fica no aparelho. O app não exibe textos de oração.

## Como executar

Módulos ES e Service Worker exigem `http://localhost` ou `https://` (abrir o index.html com duplo clique não funciona).

**No computador**
1. Abra um terminal na pasta do projeto.
2. `python3 -m http.server 8080` (ou `npx serve .`).
3. Acesse http://localhost:8080

**No celular**
- Mesma rede Wi-Fi: rode o servidor no computador e abra `http://IP-DO-COMPUTADOR:8080`. Atenção: sem HTTPS, o celular não instala como PWA nem registra o Service Worker.
- Para instalar de verdade, publique a pasta em qualquer hospedagem estática com HTTPS (GitHub Pages, Netlify, Cloudflare Pages). Os arquivos são estáticos; nenhum dado é enviado.

## Instalar como PWA
- Android (Chrome): menu ⋮ → Instalar app.
- iPhone (Safari): Compartilhar → Adicionar à Tela de Início.
- Chrome/Edge no computador: ícone de instalar na barra de endereço.

## Testar o modo offline
1. Abra o app uma vez com internet (o cache é criado na primeira abertura).
2. DevTools → Application → Service Workers: confirme "activated".
3. Marque "Offline" (aba Network) e recarregue: o app abre normalmente.

## Lembretes: limitação dos navegadores
Navegadores não permitem agendar notificações com o app totalmente fechado sem um servidor push.
O Rezaí avisa nos horários das práticas enquanto estiver aberto (inclusive em segundo plano, se o navegador permitir) e, sem permissão do sistema, mostra o lembrete dentro do app. Para alertas garantidos, use também o alarme do celular. O app só informa "exibida" quando o navegador confirma.

## Dados e backup
- Armazenamento: LocalStorage (chave `rezai:data`). IndexedDB não foi necessário para este volume de dados.
- Limpar os dados do navegador ou desinstalar o app pode apagar o histórico: use Configurações → Exportar backup.
- Importação valida e sanea o arquivo; uma cópia dos dados atuais é guardada antes de substituir.

## Estrutura
index.html · styles.css · app.js (controlador) · views.js (interface) · storage.js (persistência, validação, migração, backup) · defaults.js (sugestões e modelos) · dates.js (datas locais) · goals.js (metas) · streak.js (perseverança) · calendar.js · stats.js · notify.js (lembretes) · icons.js · service-worker.js · manifest.json · icons/ · tests/logic.test.mjs (`node tests/logic.test.mjs`)

Ao atualizar o app, aumente a versão em `CACHE` no service-worker.js.
