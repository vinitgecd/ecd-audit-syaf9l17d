migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userId

    try {
      const existingUser = app.findAuthRecordByEmail('_pb_users_auth_', 'vinitg44@gmail.com')
      userId = existingUser.id
    } catch (_) {
      const record = new Record(users)
      record.setEmail('vinitg44@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
      userId = record.id
    }

    const projects = app.findCollectionByNameOrId('projects')

    try {
      app.findFirstRecordByData('projects', 'name', 'Auditoria Anual 2023 - TechCorp')
    } catch (_) {
      const p1 = new Record(projects)
      p1.set('user_id', userId)
      p1.set('name', 'Auditoria Anual 2023 - TechCorp')
      p1.set('client', 'TechCorp S.A.')
      p1.set('status', 'active')
      app.save(p1)

      const p2 = new Record(projects)
      p2.set('user_id', userId)
      p2.set('name', 'Revisão Fiscal - GlobalLogistics')
      p2.set('client', 'GlobalLogistics Ltda.')
      p2.set('status', 'completed')
      app.save(p2)
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'vinitg44@gmail.com')
      app.delete(user)
    } catch (_) {}
  },
)
