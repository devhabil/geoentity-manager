import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { entityApi, type Entity } from '../../api/client'
import type { EntityInput } from './schema'

export const ENTITIES_QUERY_KEY = ['entities'] as const

export function useEntities() {
  return useQuery<Entity[]>({
    queryKey: ENTITIES_QUERY_KEY,
    queryFn: () => entityApi.list(),
  })
}

export function useCreateEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EntityInput) => entityApi.create(input),
    onSuccess: (created) => {
      qc.setQueryData<Entity[]>(ENTITIES_QUERY_KEY, (old) =>
        old ? [...old, created] : [created],
      )
      qc.invalidateQueries({ queryKey: ENTITIES_QUERY_KEY })
    },
  })
}

export function useUpdateEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EntityInput }) =>
      entityApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData<Entity[]>(ENTITIES_QUERY_KEY, (old) =>
        old ? old.map((e) => (e.id === updated.id ? updated : e)) : [updated],
      )
      qc.invalidateQueries({ queryKey: ENTITIES_QUERY_KEY })
    },
  })
}

export function useDeleteEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => entityApi.remove(id),
    onSuccess: (_res, id) => {
      qc.setQueryData<Entity[]>(ENTITIES_QUERY_KEY, (old) =>
        old ? old.filter((e) => e.id !== id) : [],
      )
      qc.invalidateQueries({ queryKey: ENTITIES_QUERY_KEY })
    },
  })
}
