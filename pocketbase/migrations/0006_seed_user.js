migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'vinitg44@gmail.com')
      return // User already exists
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('vinitg44@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'vinitg44@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
