# Plano de Implementação: Produtos Tipo Kit (Desmembramento e Unificação)

Este plano detalha o desenvolvimento do suporte a **Produtos Kit** no sistema Persys. Um produto Kit (ex: "Kit Churrasco") inicia unificado e é desmembrado pelo Setor de Arte em múltiplos componentes individuais (ex: "Caixa" -> Silk, "Tábua" -> Laser), sendo unificado novamente na etapa de Embale.

---

## 1. Visão Geral e Regras de Negócio

### A. Fluxo do Kit na Produção:
1. **Vendas**: Lança o kit como um único item (ex: "Kit Churrasco", Qtd: 10).
2. **Separação**: O kit é exibido de forma unificada (mostra apenas o item pai) para que a separação das caixas/peças ocorra em lote.
3. **Arte Final (Desmembramento)**:
   - O designer tem a opção de marcar o item como **Kit** no modal de aprovação.
   - Ao marcar, abre-se uma interface dinâmica para adicionar N componentes.
   - Cada componente tem: Nome, Setor de Destino (Laser, Silk, Tampo, etc.), Cor de Gravação, Observação, Layout (PDF/Imagem) e Arquivo de Impressão (Vetor/PDF).
   - Ao salvar/aprovar a arte, os componentes são gravados no banco de dados como itens filhos vinculados ao ID do Kit principal.
4. **Desembale**: A partir desta etapa, os itens filhos são mostrados de forma individual para que cada componente seja encaminhado ao setor de impressão correto.
5. **Impressão**: Cada setor (Silk, Laser, Tampo, etc.) enxerga e produz o seu componente de forma independente, com uma tag indicando que pertence a um Kit.
6. **Embale (Unificação)**: Os componentes impressos voltam a se agrupar sob o Kit pai. O Kit pai só aparece pronto para embalagem na fila de Embale quando **todos** os seus componentes estiverem finalizados.

---

## 2. Critérios de Sucesso
- [x] Cadastro dinâmico de componentes no modal de aprovação de arte (adicionar/remover linhas).
- [x] Upload individual de layout e arquivo de impressão para cada componente do kit.
- [x] Divisão correta no banco de dados (`itens_pedido` com relação de pai-filho).
- [x] Ocultação de sub-itens na fila de **Separação** (exibir apenas o pai).
- [x] Exibição de sub-itens na fila de **Desembale** e setores de **Impressão**.
- [x] Unificação na fila de **Embale** (o kit pai só entra em Embale quando todos os filhos estiverem prontos).
- [x] Exibição visual de uma tag/badge identificando produtos tipo Kit em todas as etapas da produção.
- [x] Exclusão segura de sub-itens e limpeza de seus respectivos arquivos físicos no disco caso o pedido ou o item pai seja deletado.

---

## 3. Alterações de Banco de Dados (`itens_pedido`)
Adicionar 3 novas colunas à tabela `itens_pedido`:
- `is_kit` (INTEGER DEFAULT 0): Identifica se o item é um produto do tipo Kit principal.
- `parent_item_id` (INTEGER NULL): Guarda o ID do item principal se este registro for um componente desmembrado do Kit.
- `is_kit_component` (INTEGER DEFAULT 0): Identifica se o registro é um componente/filho de um Kit.

---

## 4. Estrutura de Arquivos Envolvidos
- **Backend**:
  - `server/database.js` (Definição de colunas e migração).
  - `server/routes/production.js` (Rotas de salvamento de kit, upload de arquivos de sub-itens e transição de status).
  - `server/routes/orders.js` (Cascateamento de deleção para sub-itens).
  - `server/utils/fileCleanup.js` (Limpeza física de arquivos de sub-itens).
- **Frontend**:
  - `public/js/app.js` (Renderização de filas de produção, lógica de unificação de Embale, modal de arte e campos dinâmicos de componentes).

---

## 5. Cronograma de Tarefas (Task Breakdown)

### P0: Banco de Dados e Infraestrutura (Backend)
#### Tarefa 1: Migração do Banco de Dados
- **Agente**: `database-architect`
- **Ação**: Adicionar colunas `is_kit`, `parent_item_id` e `is_kit_component` na tabela `itens_pedido` em `server/database.js`. Atualizar `schema_itens.json`.
- **INPUT**: Schema atual.
- **OUTPUT**: Colunas adicionadas na tabela `itens_pedido`.
- **VERIFY**: Executar consulta SQLite para certificar a presença das três novas colunas na tabela.

#### Tarefa 2: Ajuste da Rota de Deleção de Pedido/Item
- **Agente**: `backend-specialist`
- **Ação**: Atualizar `server/routes/orders.js` e `server/utils/fileCleanup.js` para buscar e deletar todos os arquivos vinculados a sub-itens (`parent_item_id = ID_PAI`) e apagar os registros filhos quando o item pai ou o pedido for excluído.
- **INPUT**: Rotas de exclusão atuais.
- **OUTPUT**: Remoção em cascata funcional para componentes e seus arquivos.
- **VERIFY**: Criar kit de teste, deletar e verificar se arquivos e linhas sumiram da pasta `/uploads` e do banco.

---

### P1: Interface do Setor de Arte (Frontend e API)
#### Tarefa 3: Modal de Arte Final com Cadastro de Componentes
- **Agente**: `frontend-specialist`
- **Ação**: Modificar o modal `openArteAction` em `public/js/app.js` para incluir o checkbox "Este produto é um Kit". Ao marcar, renderizar dinamicamente um formulário para adicionar/remover componentes.
- **INPUT**: Modal de arte existente.
- **OUTPUT**: Componente UI de formulário dinâmico.
- **VERIFY**: Clicar no checkbox e validar o surgimento das linhas de inserção de componentes na tela.

#### Tarefa 4: Uploads de Arquivos para Componentes Individuais
- **Agente**: `backend-specialist` + `frontend-specialist`
- **Ação**: Implementar lógica para lidar com o upload de layout e arquivo de gravação individual por componente. No backend, criar ou adaptar endpoints para aceitar os uploads salvando-os nas colunas corretas dos sub-itens.
- **INPUT**: Endpoints de upload atuais.
- **OUTPUT**: Salvamento individual de arquivos por sub-item.
- **VERIFY**: Fazer o upload de um arquivo em um componente e checar no banco se o caminho foi salvo no respectivo sub-item.

#### Tarefa 5: Aprovamento de Arte Final e Salvamento do Kit
- **Agente**: `backend-specialist`
- **Ação**: Criar rota `POST /api/production/item/:id/desmembrar-kit` para salvar os dados dos sub-itens enviados pelo frontend. A rota deve criar os registros na tabela `itens_pedido` ligando-os com `parent_item_id = id_pai`, `is_kit_component = 1`, herdando a quantidade do pai.
- **INPUT**: Dados dos componentes preenchidos na tela.
- **OUTPUT**: Novos registros de sub-itens inseridos e item pai atualizado com `is_kit = 1`.
- **VERIFY**: Validar no SQLite a criação de registros vinculados.

---

### P2: Controle de Fluxo por Setor (Kanban/Produção)
#### Tarefa 6: Fila de Separação (Visualização Unificada)
- **Agente**: `frontend-specialist`
- **Ação**: Atualizar a função de renderização da fila de Separação (`renderProductionRows`) para omitir itens com `is_kit_component = 1`. Somente o item pai do Kit (`is_kit = 1` ou item simples) deve ser listado.
- **INPUT**: Filtro de exibição de Separação.
- **OUTPUT**: Fila de separação limpa mostrando apenas kits inteiros.
- **VERIFY**: Verificar se sub-itens não aparecem na Separação, mas o Kit pai sim.

#### Tarefa 7: Fila de Desembale e Setores de Impressão (Visualização Desmembrada)
- **Agente**: `frontend-specialist`
- **Ação**: Atualizar a renderização de Desembale e filas de Impressão (Silk, Laser, Tampo, etc.) para exibir os sub-itens individualmente. Adicionar uma tag visual destacada `[KIT]` ao lado do nome do sub-item indicando a qual Kit pai ele pertence.
- **INPUT**: Filtros de fila de produção.
- **OUTPUT**: Componentes impressos visíveis em seus respectivos setores com tag visual de kit.
- **VERIFY**: Navegar pelas filas de impressão e conferir se os componentes aparecem nos locais corretos com a etiqueta de Kit.

#### Tarefa 8: Fila de Embale (Unificação e Sincronização)
- **Agente**: `backend-specialist` + `frontend-specialist`
- **Ação**: 
  - Impedir que os componentes individuais apareçam em Embale. Apenas o kit pai deve aparecer.
  - O kit pai deve entrar na fila de Embale apenas quando **todos** os seus filhos (`parent_item_id = ID_PAI`) estiverem no status final de impressão (ex: concluídos e prontos para embalagem).
- **INPUT**: Verificação de status na consulta de Embale.
- **OUTPUT**: Unificação de kits na etapa final.
- **VERIFY**: Concluir a impressão de 2 de 3 componentes e verificar se o kit NÃO aparece em Embale. Concluir o 3º e verificar se o kit pai aparece.

---

## 6. Plano de Verificação (Phase X)
Executar os seguintes testes locais:
- [x] **Teste 1**: Criar um pedido contendo "Kit Teste".
- [x] **Teste 2**: Na tela de Arte, desmembrar o "Kit Teste" em "Item A (Silk)" e "Item B (Laser)" e aprovar.
- [x] **Teste 3**: Garantir que na Separação só aparece "Kit Teste".
- [x] **Teste 4**: Concluir Separação e validar que no Desembale aparecem "Item A" e "Item B".
- [x] **Teste 5**: Processar "Item A" no Silk e "Item B" no Laser.
- [x] **Teste 6**: Garantir que o "Kit Teste" só aparece na fila de Embale após ambos os itens serem finalizados.
- [x] **Teste 7**: Excluir o pedido e garantir que todos os arquivos enviados para o kit e componentes foram deletados do disco.
