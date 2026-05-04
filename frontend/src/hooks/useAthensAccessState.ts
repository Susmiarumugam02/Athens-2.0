import { useQuery } from '@tanstack/react-query'
import type { AthensAccessState } from '../services/athensSustCompanyApi'
import { athensSustCompanyApi } from '../services/athensSustCompanyApi'

export const useAthensAccessState = (enabled = true) => {
  return useQuery<AthensAccessState>({
    queryKey: ['athens-access-state'],
    queryFn: () => athensSustCompanyApi.getAccessState(),
    retry: false,
    enabled
  })
}
