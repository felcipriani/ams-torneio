# Requirements Document

## Introduction

Este documento define os requisitos para otimização do uso do viewport height (vh) na aplicação de Campeonato de Memes. Atualmente, os elementos da interface são muito grandes, forçando usuários a fazer scroll mesmo em telas desktop para visualizar e interagir com o conteúdo. O objetivo é criar uma interface elegante e bonita que caiba completamente dentro do viewport disponível, sem necessidade de scroll, tanto em desktop quanto em mobile.

## Glossary

- **Viewport Height (vh)**: A altura visível da janela do navegador
- **Sistema**: A aplicação web de Campeonato de Memes
- **Usuário**: Qualquer pessoa acessando a aplicação (participante ou administrador)
- **WaitingScreen**: Tela exibida quando o torneio ainda não foi iniciado
- **DuelView**: Tela de votação onde dois memes são comparados
- **MemeCard**: Componente que exibe um meme individual com imagem, legenda e botão de voto
- **WinnerScreen**: Tela de celebração exibida ao final do torneio
- **AdminView**: Painel administrativo para gerenciar o torneio
- **Timer**: Componente de contagem regressiva circular

## Requirements

### Requirement 1

**User Story:** Como usuário em desktop, quero visualizar toda a interface de votação sem precisar fazer scroll, para que eu possa votar rapidamente e ter uma experiência fluida.

#### Acceptance Criteria

1. WHEN a DuelView é exibida em uma tela desktop (≥1024px de largura) THEN o Sistema SHALL exibir ambos os MemeCards, o Timer e o header dentro de 100vh sem overflow vertical
2. WHEN um MemeCard é renderizado THEN o Sistema SHALL utilizar proporções de imagem otimizadas que maximizem o uso do espaço horizontal sem exceder o viewport vertical
3. WHEN o header do DuelView é exibido THEN o Sistema SHALL utilizar tamanhos de fonte proporcionais que não excedam 15% do viewport height
4. WHEN o Timer é renderizado THEN o Sistema SHALL dimensioná-lo proporcionalmente ao espaço disponível sem ocupar mais de 12% do viewport height

### Requirement 2

**User Story:** Como usuário mobile, quero visualizar os memes empilhados verticalmente sem precisar fazer scroll excessivo, para que eu possa votar confortavelmente no meu dispositivo.

#### Acceptance Criteria

1. WHEN a DuelView é exibida em uma tela mobile (<768px de largura) THEN o Sistema SHALL organizar os MemeCards verticalmente com espaçamento otimizado para caber em 100vh
2. WHEN MemeCards são empilhados verticalmente THEN o Sistema SHALL reduzir o tamanho de cada card proporcionalmente para que ambos caibam no viewport
3. WHEN o usuário visualiza a interface mobile THEN o Sistema SHALL reduzir padding e margins para maximizar o espaço de conteúdo
4. WHEN imagens são exibidas em mobile THEN o Sistema SHALL utilizar aspect ratio mais horizontal (ex: 4:3 ou 16:9) ao invés de quadrado para economizar altura

### Requirement 3

**User Story:** Como usuário aguardando o início do torneio, quero ver uma mensagem de espera elegante mas não dominante, para que eu não me sinta sobrecarregado visualmente.

#### Acceptance Criteria

1. WHEN a WaitingScreen é exibida THEN o Sistema SHALL utilizar tamanhos de fonte que não excedam 8% do viewport height para o texto principal
2. WHEN a mensagem "Sessão ainda não iniciada" é renderizada THEN o Sistema SHALL aplicar text-2xl ou text-3xl ao invés de text-5xl/text-7xl
3. WHEN a WaitingScreen é exibida THEN o Sistema SHALL manter a animação de pulsação mas com elementos proporcionalmente menores
4. WHEN o usuário visualiza a WaitingScreen THEN o Sistema SHALL centralizar o conteúdo verticalmente sem ocupar mais de 40% do viewport height

### Requirement 4

**User Story:** Como usuário visualizando o vencedor, quero ver uma celebração impactante mas que caiba na tela, para que eu possa apreciar o meme vencedor completamente sem scroll.

#### Acceptance Criteria

1. WHEN a WinnerScreen é exibida THEN o Sistema SHALL dimensionar todos os elementos para caber em 100vh incluindo título, imagem e mensagem de celebração
2. WHEN o título "Meme do Ano" é renderizado THEN o Sistema SHALL utilizar tamanhos de fonte responsivos que não excedam 12% do viewport height
3. WHEN a imagem do meme vencedor é exibida THEN o Sistema SHALL limitar a altura máxima da imagem a 50% do viewport height
4. WHEN confetti é animado THEN o Sistema SHALL manter a animação sem afetar o layout ou causar overflow

### Requirement 5

**User Story:** Como administrador, quero visualizar o painel administrativo com todos os controles visíveis, para que eu possa gerenciar o torneio eficientemente.

#### Acceptance Criteria

1. WHEN o AdminView está em estado WAITING THEN o Sistema SHALL organizar upload zone, configuração e lista de memes para minimizar scroll vertical
2. WHEN a lista de memes é exibida THEN o Sistema SHALL utilizar scroll interno no container de memes ao invés de expandir a página
3. WHEN o AdminDuelView é exibido THEN o Sistema SHALL aplicar as mesmas otimizações de viewport do DuelView participante
4. WHEN múltiplas seções são exibidas THEN o Sistema SHALL utilizar espaçamento vertical otimizado (gap-4 ao invés de gap-8)

### Requirement 6

**User Story:** Como desenvolvedor, quero que as otimizações de viewport sejam responsivas e adaptáveis, para que a interface funcione bem em qualquer tamanho de tela.

#### Acceptance Criteria

1. WHEN o viewport é redimensionado THEN o Sistema SHALL recalcular proporções dinamicamente usando unidades vh e vw
2. WHEN breakpoints do Tailwind são atingidos THEN o Sistema SHALL aplicar ajustes específicos para cada tamanho de tela (sm, md, lg, xl)
3. WHEN elementos utilizam tamanhos fixos THEN o Sistema SHALL convertê-los para unidades relativas (rem, vh, vw, %)
4. WHEN padding e margins são aplicados THEN o Sistema SHALL utilizar valores proporcionais que escalam com o viewport

### Requirement 7

**User Story:** Como usuário, quero que a interface mantenha sua elegância visual após as otimizações, para que a experiência continue sendo agradável e profissional.

#### Acceptance Criteria

1. WHEN elementos são redimensionados THEN o Sistema SHALL manter hierarquia visual e proporções harmoniosas
2. WHEN espaçamentos são reduzidos THEN o Sistema SHALL preservar respiração visual adequada entre elementos
3. WHEN fontes são ajustadas THEN o Sistema SHALL manter legibilidade e contraste apropriados
4. WHEN animações são mantidas THEN o Sistema SHALL garantir que continuem suaves e não causem layout shift
