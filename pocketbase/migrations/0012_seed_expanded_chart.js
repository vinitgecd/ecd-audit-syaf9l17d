migrate(
  (app) => {
    try {
      const project = app.findFirstRecordByFilter('projects', "status='active'")
      if (!project) return

      const col = app.findCollectionByNameOrId('accounts')

      const chart = [
        { code: '1', name: 'Ativo', type: 'asset', level: 1, nature: '01', is_group: true },
        {
          code: '1.1',
          name: 'Ativo Circulante',
          type: 'asset',
          level: 2,
          nature: '01',
          is_group: true,
          parent_code: '1',
        },
        {
          code: '1.1.01',
          name: 'Disponibilidades',
          type: 'asset',
          level: 3,
          nature: '01',
          is_group: true,
          parent_code: '1.1',
        },
        {
          code: '1.1.01.01',
          name: 'Caixa Geral',
          type: 'asset',
          level: 4,
          nature: '01',
          is_group: false,
          parent_code: '1.1.01',
        },
        {
          code: '1.1.01.02',
          name: 'Bancos Conta Movimento',
          type: 'asset',
          level: 4,
          nature: '01',
          is_group: false,
          parent_code: '1.1.01',
        },

        { code: '2', name: 'Passivo', type: 'liability', level: 1, nature: '02', is_group: true },
        {
          code: '2.1',
          name: 'Passivo Circulante',
          type: 'liability',
          level: 2,
          nature: '02',
          is_group: true,
          parent_code: '2',
        },
        {
          code: '2.1.01',
          name: 'Fornecedores',
          type: 'liability',
          level: 3,
          nature: '02',
          is_group: false,
          parent_code: '2.1',
        },

        { code: '3', name: 'Receitas', type: 'revenue', level: 1, nature: '03', is_group: true },
        {
          code: '3.1',
          name: 'Receita Bruta',
          type: 'revenue',
          level: 2,
          nature: '03',
          is_group: true,
          parent_code: '3',
        },
        {
          code: '3.1.01',
          name: 'Receita de Vendas',
          type: 'revenue',
          level: 3,
          nature: '03',
          is_group: false,
          parent_code: '3.1',
        },

        { code: '4', name: 'Despesas', type: 'expense', level: 1, nature: '04', is_group: true },
        {
          code: '4.1',
          name: 'Despesas Administrativas',
          type: 'expense',
          level: 2,
          nature: '04',
          is_group: true,
          parent_code: '4',
        },
        {
          code: '4.1.01',
          name: 'Despesas com Pessoal',
          type: 'expense',
          level: 3,
          nature: '04',
          is_group: false,
          parent_code: '4.1',
        },
      ]

      const inserted = {}

      for (const item of chart) {
        let record
        try {
          record = app.findFirstRecordByFilter(
            'accounts',
            `project_id='${project.id}' && code='${item.code}'`,
          )
        } catch (e) {
          record = new Record(col)
        }

        record.set('project_id', project.id)
        record.set('code', item.code)
        record.set('name', item.name)
        record.set('type', item.type)
        record.set('level', item.level)
        record.set('nature', item.nature)
        record.set('is_group', item.is_group)

        if (item.parent_code && inserted[item.parent_code]) {
          record.set('parent_id', inserted[item.parent_code])
        }

        app.save(record)
        inserted[item.code] = record.id
      }
    } catch (e) {
      console.log('Migration 0012 failed or no project found', e)
    }
  },
  (app) => {},
)
