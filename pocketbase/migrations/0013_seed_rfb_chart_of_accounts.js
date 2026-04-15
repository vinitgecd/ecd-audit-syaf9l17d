migrate(
  (app) => {
    let user
    try {
      user = app.findFirstRecordByData('_pb_users_auth_', 'email', 'vinitg44@gmail.com')
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      user = new Record(users)
      user.setEmail('vinitg44@gmail.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin')
      app.save(user)
    }

    let project
    try {
      project = app.findFirstRecordByData('projects', 'name', 'Plano de Contas Referencial RFB')
    } catch (_) {
      const projects = app.findCollectionByNameOrId('projects')
      project = new Record(projects)
      project.set('user_id', user.id)
      project.set('name', 'Plano de Contas Referencial RFB')
      project.set('client', 'Receita Federal do Brasil (Modelo)')
      project.set('status', 'active')
      app.save(project)
    }

    const accountsData = [
      { code: '1', name: 'Ativo', type: 'asset', nature: 'debit', is_group: true, level: 1 },
      {
        code: '1.1',
        name: 'Ativo Circulante',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 2,
        parentCode: '1',
      },
      {
        code: '1.1.01',
        name: 'Disponibilidades',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '1.1',
      },
      {
        code: '1.1.01.01',
        name: 'Caixa e Equivalentes de Caixa',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 4,
        parentCode: '1.1.01',
      },
      {
        code: '1.1.01.01.01',
        name: 'Caixa Geral',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        level: 5,
        parentCode: '1.1.01.01',
      },
      {
        code: '1.1.01.02',
        name: 'Bancos Conta Movimento',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 4,
        parentCode: '1.1.01',
      },
      {
        code: '1.1.01.02.01',
        name: 'Banco do Brasil S.A.',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        level: 5,
        parentCode: '1.1.01.02',
      },
      {
        code: '1.2',
        name: 'Ativo Não Circulante',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 2,
        parentCode: '1',
      },
      {
        code: '1.2.01',
        name: 'Realizável a Longo Prazo',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '1.2',
      },
      {
        code: '1.2.02',
        name: 'Investimentos',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '1.2',
      },
      {
        code: '1.2.03',
        name: 'Imobilizado',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '1.2',
      },
      {
        code: '1.2.03.01',
        name: 'Bens Tangíveis',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 4,
        parentCode: '1.2.03',
      },
      {
        code: '1.2.03.01.01',
        name: 'Veículos',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        level: 5,
        parentCode: '1.2.03.01',
      },
      {
        code: '1.2.03.01.02',
        name: 'Móveis e Utensílios',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        level: 5,
        parentCode: '1.2.03.01',
      },
      {
        code: '1.2.04',
        name: 'Intangível',
        type: 'asset',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '1.2',
      },
      { code: '2', name: 'Passivo', type: 'liability', nature: 'credit', is_group: true, level: 1 },
      {
        code: '2.1',
        name: 'Passivo Circulante',
        type: 'liability',
        nature: 'credit',
        is_group: true,
        level: 2,
        parentCode: '2',
      },
      {
        code: '2.1.01',
        name: 'Fornecedores',
        type: 'liability',
        nature: 'credit',
        is_group: true,
        level: 3,
        parentCode: '2.1',
      },
      {
        code: '2.1.01.01',
        name: 'Fornecedores Nacionais',
        type: 'liability',
        nature: 'credit',
        is_group: false,
        level: 4,
        parentCode: '2.1.01',
      },
      {
        code: '2.1.02',
        name: 'Obrigações Trabalhistas e Previdenciárias',
        type: 'liability',
        nature: 'credit',
        is_group: true,
        level: 3,
        parentCode: '2.1',
      },
      {
        code: '2.1.02.01',
        name: 'Salários a Pagar',
        type: 'liability',
        nature: 'credit',
        is_group: false,
        level: 4,
        parentCode: '2.1.02',
      },
      {
        code: '2.2',
        name: 'Passivo Não Circulante',
        type: 'liability',
        nature: 'credit',
        is_group: true,
        level: 2,
        parentCode: '2',
      },
      {
        code: '2.2.01',
        name: 'Empréstimos e Financiamentos',
        type: 'liability',
        nature: 'credit',
        is_group: true,
        level: 3,
        parentCode: '2.2',
      },
      {
        code: '3',
        name: 'Patrimônio Líquido',
        type: 'equity',
        nature: 'credit',
        is_group: true,
        level: 1,
      },
      {
        code: '3.1',
        name: 'Capital Social',
        type: 'equity',
        nature: 'credit',
        is_group: true,
        level: 2,
        parentCode: '3',
      },
      {
        code: '3.1.01',
        name: 'Capital Subscrito e Integralizado',
        type: 'equity',
        nature: 'credit',
        is_group: false,
        level: 3,
        parentCode: '3.1',
      },
      {
        code: '3.2',
        name: 'Reservas',
        type: 'equity',
        nature: 'credit',
        is_group: true,
        level: 2,
        parentCode: '3',
      },
      { code: '4', name: 'Receitas', type: 'revenue', nature: 'credit', is_group: true, level: 1 },
      {
        code: '4.1',
        name: 'Receita Operacional',
        type: 'revenue',
        nature: 'credit',
        is_group: true,
        level: 2,
        parentCode: '4',
      },
      {
        code: '4.1.01',
        name: 'Receita Bruta de Vendas',
        type: 'revenue',
        nature: 'credit',
        is_group: true,
        level: 3,
        parentCode: '4.1',
      },
      {
        code: '4.1.01.01',
        name: 'Venda de Mercadorias',
        type: 'revenue',
        nature: 'credit',
        is_group: false,
        level: 4,
        parentCode: '4.1.01',
      },
      {
        code: '4.1.01.02',
        name: 'Prestação de Serviços',
        type: 'revenue',
        nature: 'credit',
        is_group: false,
        level: 4,
        parentCode: '4.1.01',
      },
      {
        code: '5',
        name: 'Custos e Despesas',
        type: 'expense',
        nature: 'debit',
        is_group: true,
        level: 1,
      },
      {
        code: '5.1',
        name: 'Custos das Vendas',
        type: 'expense',
        nature: 'debit',
        is_group: true,
        level: 2,
        parentCode: '5',
      },
      {
        code: '5.1.01',
        name: 'Custo das Mercadorias Vendidas (CMV)',
        type: 'expense',
        nature: 'debit',
        is_group: false,
        level: 3,
        parentCode: '5.1',
      },
      {
        code: '5.1.02',
        name: 'Custo dos Serviços Prestados (CSP)',
        type: 'expense',
        nature: 'debit',
        is_group: false,
        level: 3,
        parentCode: '5.1',
      },
      {
        code: '5.2',
        name: 'Despesas Operacionais',
        type: 'expense',
        nature: 'debit',
        is_group: true,
        level: 2,
        parentCode: '5',
      },
      {
        code: '5.2.01',
        name: 'Despesas Administrativas',
        type: 'expense',
        nature: 'debit',
        is_group: true,
        level: 3,
        parentCode: '5.2',
      },
      {
        code: '5.2.01.01',
        name: 'Despesas com Pessoal',
        type: 'expense',
        nature: 'debit',
        is_group: false,
        level: 4,
        parentCode: '5.2.01',
      },
      {
        code: '5.2.01.02',
        name: 'Aluguéis e Condomínios',
        type: 'expense',
        nature: 'debit',
        is_group: false,
        level: 4,
        parentCode: '5.2.01',
      },
    ]

    const accountsCol = app.findCollectionByNameOrId('accounts')
    const codeToId = {}

    for (const data of accountsData) {
      try {
        const existing = app.findFirstRecordByFilter(
          'accounts',
          `project_id = "${project.id}" && code = "${data.code}"`,
        )
        codeToId[data.code] = existing.id
        continue
      } catch (_) {}

      const record = new Record(accountsCol)
      record.set('project_id', project.id)
      record.set('code', data.code)
      record.set('name', data.name)
      record.set('type', data.type)
      record.set('nature', data.nature)
      record.set('is_group', data.is_group)
      record.set('level', data.level)

      if (data.parentCode && codeToId[data.parentCode]) {
        record.set('parent_id', codeToId[data.parentCode])
      }

      app.save(record)
      codeToId[data.code] = record.id
    }
  },
  (app) => {
    try {
      const project = app.findFirstRecordByData(
        'projects',
        'name',
        'Plano de Contas Referencial RFB',
      )

      // Reverse sort to delete children before parents
      const accounts = app.findRecordsByFilter(
        'accounts',
        `project_id = "${project.id}"`,
        '-code',
        1000,
        0,
      )
      for (const acc of accounts) {
        app.delete(acc)
      }
      app.delete(project)
    } catch (_) {}
  },
)
