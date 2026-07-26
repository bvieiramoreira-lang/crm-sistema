# Plano de Implementação: Fluxo de Pedidos Terceirizados

## Goal
Implementar um fluxo simplificado para pedidos terceirizados, permitindo que a Arte Final defina o setor destino como "Terceirizado", fazendo com que o item pule de "Separação" diretamente para "Embale", mantendo o log de histórico coerente e exibindo sinalização visual nas filas correspondentes.

## Tasks
- [x] Task 1: Habilitar opção "Terceirizado" no seletor de Setor Destino na interface de aprovação da Arte.
  - **Arquivo:** `public/js/app.js` (modal de aprovação da Arte)
  - **Ação:** Remover a restrição que oculta a opção "Terceirizado" para que ela fique sempre visível para seleção.
  - **Verificação:** Abrir o modal de aprovação e verificar se a opção "Terceirizado" está disponível para qualquer item.

- [x] Task 2: Atualizar lógica de aprovação no Backend para marcar `is_terceirizado = 1` se o destino for "TERCEIRIZADO".
  - **Arquivo:** `server/routes/production.js` (rotas `PUT /item/:id/arte` e `PUT /pedido/:pedidoId/aprovar`)
  - **Ação:** Atualizar a query SQL de aprovação para definir `is_terceirizado = 1` se `setor_destino === 'TERCEIRIZADO'` e `0` caso contrário.
  - **Verificação:** Aprovar um item como "Terceirizado" e verificar no banco de dados se `is_terceirizado` é gravado como `1`.

- [x] Task 3: Atualizar lógica de Reversão/Rollback para Arte Final.
  - **Arquivo:** `server/routes/production.js` (rota `PUT /item/:id/return` e `PUT /pedido/:pedidoId/reverter-arte` se aplicável)
  - **Ação:** Garantir que ao reverter o item para a Arte Final, o campo `is_terceirizado` seja resetado para `0`.
  - **Verificação:** Retornar um item para a Arte e certificar-se de que o campo foi resetado no banco.

- [x] Task 4: Tratar data de conclusão da Separação no bypass para Embale.
  - **Arquivo:** `server/routes/production.js` (rota `PUT /item/:id/status`)
  - **Ação:** Mapear `timestampCol = 'data_separacao'` quando `novo_status_item === 'AGUARDANDO_EMBALE'`.
  - **Verificação:** Concluir a separação de um item terceirizado e confirmar que `data_separacao` é devidamente preenchida com a data/hora atual.

- [x] Task 5: Adicionar badge/indicador visual "Terceirizado" nas filas de Separação e Embale.
  - **Arquivo:** `public/js/app.js` (função `renderGenericRows` ou correspondentes)
  - **Ação:** Exibir uma etiqueta estilizada em amarelo/azul ou semelhante para destacar itens terceirizados nas filas.
  - **Verificação:** Visualizar as filas de Separação e Embale no Kanban e checar se o indicador é exibido.

- [x] Task 6: Garantir que o Dossiê lide com dados vazios para as etapas puladas.
  - **Arquivo:** `public/js/app.js` (função `renderFinishedOrderDossier` e associadas)
  - **Ação:** Garantir que etapas sem datas de conclusão ou operadores fiquem vazias/em branco, sem quebras no layout.
  - **Verificação:** Acessar o dossiê de um pedido terceirizado finalizado e verificar a exibição correta.

## Done When
- [x] O arte-finalista consegue aprovar um item definindo seu Setor Destino como "Terceirizado".
- [x] O item aprovado como "Terceirizado" vai para a fila de "Separação" (com indicador visual).
- [x] Ao clicar em "Separado (Pular)", o item avança diretamente para a fila de "Embale", pulando "Desembale" e "Impressão".
- [x] A data da separação é registrada, enquanto as datas de desembale e impressão permanecem vazias.
- [x] O dossiê do pedido exibe as etapas puladas em branco, sem quebrar o layout.
- [x] Ao reverter um item terceirizado de volta para a Arte, os campos correspondentes são redefinidos.
