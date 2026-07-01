export const projectStatusConfig = {
  active: {
    label: 'Ativo',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent',
  },
  completed: {
    label: 'Concluído',
    color: 'text-green-600 dark:text-green-400',
    bgLight: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-200 dark:border-green-900',
    badge: 'bg-green-500 hover:bg-green-600 text-white border-transparent',
  },
  archived: {
    label: 'Arquivado',
    color: 'text-gray-600 dark:text-gray-400',
    bgLight: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
    badge:
      'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
} as const

export const commentStatusConfig = {
  pending: {
    label: 'Pendente',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  },
  approved: {
    label: 'Aprovado',
    className:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  rejected: {
    label: 'Reprovado',
    className:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
} as const
