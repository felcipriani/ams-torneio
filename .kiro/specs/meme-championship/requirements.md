# Requirements Document

## Introduction

O Campeonato de Memes é uma aplicação web em tempo real para retrospectivas de time, onde participantes votam em duelos eliminatórios de imagens (memes) até eleger um campeão. A aplicação possui duas interfaces: uma tela pública para votação (exibida em TV/projetor e acessível por dispositivos móveis) e uma tela administrativa para configuração e controle do torneio. Todo o estado e sincronização são gerenciados pelo backend via WebSocket, garantindo experiência consistente para todos os participantes.

## Glossary

- **Sistema**: A aplicação web Campeonato de Memes
- **Backend**: Servidor Node.js que gerencia estado, WebSocket e lógica de negócio
- **Frontend**: Interface React/Next.js que renderiza estado recebido do Backend
- **Administrador**: Usuário que acessa `/admin-view` para configurar e controlar o torneio
- **Jogador**: Usuário que acessa `/` para visualizar duelos e votar
- **Meme**: Imagem com legenda curta participante do torneio
- **Duelo**: Confronto entre dois Memes onde Jogadores votam no preferido
- **Round**: Fase do torneio contendo um ou mais Duelos
- **Bracket**: Estrutura de eliminatória do torneio mostrando todos os Duelos
- **Sessão**: Instância ativa de um torneio desde o início até a declaração do campeão
- **WebSocket**: Protocolo de comunicação bidirecional em tempo real entre Backend e Frontend
- **Snapshot**: Objeto de estado completo do torneio enviado pelo Backend via WebSocket

## Requirements

### Requirement 1

**User Story:** Como jogador, quero visualizar o estado atual do torneio em tempo real, para que eu possa acompanhar os duelos e participar da votação.

#### Acceptance Criteria

1. WHEN a Sessão não está iniciada THEN o Sistema SHALL exibir mensagem "Sessão ainda não iniciada" centralizada na tela pública
2. WHEN um Duelo está em andamento THEN o Sistema SHALL exibir duas imagens lado a lado com suas legendas na tela pública
3. WHEN o Backend envia um Snapshot via WebSocket THEN o Frontend SHALL atualizar a interface imediatamente para refletir o novo estado
4. WHEN o torneio termina THEN o Sistema SHALL exibir a imagem campeã em destaque com indicação visual de "Meme do Ano"
5. WHILE um Duelo está ativo THEN o Sistema SHALL exibir cronômetro regressivo sincronizado com o Backend

### Requirement 2

**User Story:** Como jogador, quero votar no meme de minha preferência durante um duelo, para que minha opinião seja contabilizada no resultado.

#### Acceptance Criteria

1. WHEN um Jogador clica no botão de voto de uma imagem THEN o Sistema SHALL enviar evento de voto via WebSocket para o Backend
2. WHILE o cronômetro do Duelo está ativo THEN o Sistema SHALL permitir que Jogadores enviem votos
3. WHEN o tempo de votação expira THEN o Sistema SHALL desabilitar os botões de voto
4. WHEN o Backend processa um voto THEN o Sistema SHALL atualizar a contagem de votos exibida em tempo real
5. WHEN um Jogador tenta votar após o término do tempo THEN o Backend SHALL rejeitar o voto

### Requirement 3

**User Story:** Como administrador, quero fazer upload de múltiplas imagens com legendas, para que eu possa configurar os participantes do torneio.

#### Acceptance Criteria

1. WHEN o Administrador arrasta arquivos para a área de upload THEN o Sistema SHALL aceitar múltiplos arquivos simultaneamente
2. WHEN o Sistema recebe um arquivo de imagem THEN o Backend SHALL validar que o tamanho não excede 5MB
3. WHEN o Sistema recebe um arquivo THEN o Backend SHALL validar que o tipo é PNG, JPG, JPEG ou WEBP
4. IF um arquivo excede 5MB ou possui tipo inválido THEN o Sistema SHALL rejeitar o arquivo e exibir mensagem de erro específica
5. WHEN uma imagem é carregada com sucesso THEN o Sistema SHALL exibir preview da imagem com campo editável para legenda curta

### Requirement 4

**User Story:** Como administrador, quero configurar e iniciar o torneio, para que os jogadores possam começar a votar nos duelos.

#### Acceptance Criteria

1. WHEN o Administrador acessa `/admin-view` THEN o Sistema SHALL exibir interface de configuração do torneio
2. WHILE há menos de 2 Memes válidos carregados THEN o Sistema SHALL manter o botão "Iniciar torneio" desabilitado
3. WHEN o Administrador define tempo de votação em segundos THEN o Sistema SHALL armazenar essa configuração
4. WHEN o Administrador clica em "Iniciar torneio" com pelo menos 2 Memes válidos THEN o Backend SHALL gerar o Bracket de eliminatória
5. WHEN o torneio é iniciado THEN o Backend SHALL enviar Snapshot via WebSocket notificando todos os clientes conectados

### Requirement 5

**User Story:** Como administrador, quero monitorar o progresso do torneio em tempo real, para que eu possa acompanhar votos e resultados de cada duelo.

#### Acceptance Criteria

1. WHILE um Duelo está em andamento THEN o Sistema SHALL exibir para o Administrador as duas imagens do confronto atual
2. WHEN Jogadores votam THEN o Sistema SHALL atualizar em tempo real a contagem de votos visível ao Administrador
3. WHEN o cronômetro de um Duelo chega a zero THEN o Backend SHALL calcular o vencedor baseado na maior contagem de votos
4. WHEN há empate em votos THEN o Backend SHALL decidir o vencedor por sorteio aleatório
5. WHEN um Duelo termina THEN o Backend SHALL avançar automaticamente para o próximo Duelo ou finalizar o torneio

### Requirement 6

**User Story:** Como administrador, quero visualizar o bracket completo do torneio, para que eu possa entender a estrutura de eliminatória e o progresso.

#### Acceptance Criteria

1. WHEN o torneio é iniciado THEN o Sistema SHALL exibir preview visual do Bracket completo ao Administrador
2. WHILE o torneio progride THEN o Sistema SHALL indicar visualmente quais Memes foram eliminados e quais avançaram
3. WHEN o Sistema exibe o Bracket THEN cada Duelo SHALL mostrar as imagens participantes organizadas por Round
4. WHEN um Round é completado THEN o Sistema SHALL atualizar o Bracket mostrando os vencedores avançando para o próximo Round

### Requirement 7

**User Story:** Como desenvolvedor, quero que o backend controle todo o estado do torneio, para que haja uma única fonte de verdade e sincronização consistente.

#### Acceptance Criteria

1. WHEN o Backend mantém estado do torneio THEN ele SHALL armazenar lista de Memes, estrutura do Bracket, estado global e informações do Duelo atual em memória
2. WHEN o estado do torneio muda THEN o Backend SHALL enviar Snapshot completo via WebSocket para todos os clientes conectados
3. WHEN o Frontend recebe um Snapshot THEN ele SHALL renderizar a interface baseando-se exclusivamente nos dados recebidos
4. WHEN o Backend gerencia cronômetro THEN ele SHALL decrementar tempo restante internamente e emitir atualizações periódicas via WebSocket
5. WHEN o Frontend envia evento de voto THEN o Backend SHALL validar se a votação está aberta antes de processar

### Requirement 8

**User Story:** Como usuário, quero uma interface visualmente atraente e responsiva, para que eu tenha uma experiência agradável em qualquer dispositivo.

#### Acceptance Criteria

1. WHEN o Sistema renderiza componentes de UI THEN ele SHALL utilizar ShadCN UI ou Material UI de forma consistente
2. WHEN um Duelo inicia THEN o Sistema SHALL animar as imagens movendo-as para as posições esquerda e direita
3. WHEN a interface é acessada em dispositivo móvel THEN o Sistema SHALL adaptar o layout para telas pequenas mantendo usabilidade
4. WHEN a interface é acessada em TV ou projetor THEN o Sistema SHALL exibir conteúdo em tela cheia com boa legibilidade
5. WHEN transições de estado ocorrem THEN o Sistema SHALL aplicar animações suaves baseadas em mudanças de estado recebidas do Backend

### Requirement 9

**User Story:** Como desenvolvedor, quero validar o comportamento do frontend usando Playwright MCP, para que eu possa verificar o fluxo completo da aplicação de forma exploratória.

#### Acceptance Criteria

1. WHEN a aplicação é testada com Playwright MCP THEN o teste SHALL navegar para rota `/` e capturar snapshot da tela sem Sessão iniciada
2. WHEN o teste acessa `/admin-view` THEN ele SHALL simular upload de imagens, inserção de legendas e configuração de tempo de votação
3. WHEN o teste inicia o torneio THEN ele SHALL validar que a tela pública muda para exibir o primeiro Duelo
4. WHEN o teste observa um Duelo THEN ele SHALL validar que cronômetro diminui e votos são contabilizados
5. WHEN o torneio termina THEN o teste SHALL capturar snapshot da tela final exibindo o campeão


### Requirement 10

**User Story:** Como desenvolvedor, quero que a camada de persistência seja facilmente substituível, para que no futuro eu possa trocar a implementação em memória por uma solução com banco de dados sem modificar a lógica de negócio.

#### Acceptance Criteria

1. WHEN o Sistema define interfaces de persistência THEN ele SHALL criar abstrações que não exponham detalhes de implementação
2. WHEN uma nova implementação de persistência é criada THEN ela SHALL poder substituir a implementação em memória sem modificar código cliente
3. WHEN o Sistema acessa dados THEN ele SHALL fazê-lo através de interfaces abstratas e não de implementações concretas
4. WHEN métodos de persistência são definidos THEN eles SHALL seguir o Liskov Substitution Principle permitindo substituição transparente
5. WHEN a implementação de persistência muda THEN a lógica de negócio do Tournament Manager SHALL permanecer inalterada
