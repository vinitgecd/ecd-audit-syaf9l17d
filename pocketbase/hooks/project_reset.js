routerAdd(
  'POST',
  '/backend/v1/projects/{projectId}/reset',
  (e) => {
    const projectId = e.request.pathValue('projectId')

    const project = $app.findRecordById('projects', projectId)
    if (project.getString('user_id') !== e.auth.id && !e.hasSuperuserAuth()) {
      return e.forbiddenError('Not allowed')
    }

    $app
      .db()
      .newQuery(
        'DELETE FROM entry_items WHERE entry_id IN (SELECT id FROM journal_entries WHERE project_id = {:projectId})',
      )
      .bind({ projectId })
      .execute()
    $app
      .db()
      .newQuery('DELETE FROM journal_entries WHERE project_id = {:projectId}')
      .bind({ projectId })
      .execute()
    $app
      .db()
      .newQuery('DELETE FROM accounts WHERE project_id = {:projectId}')
      .bind({ projectId })
      .execute()

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
