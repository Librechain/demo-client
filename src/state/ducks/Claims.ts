import * as sdk from '@kiltprotocol/sdk-js'
import Immutable from 'immutable'
import { createSelector } from 'reselect'

import errorService from '../../services/ErrorService'
import KiltAction from '../../types/Action'
import { IMyIdentity } from '../../types/Contact'
import { ICType } from '../../types/Ctype'
import { State as ReduxState } from '../PersistentStore'
import * as Wallet from './Wallet'

function hash(claim: sdk.IPartialClaim): string {
  return sdk.Crypto.hashStr(JSON.stringify(claim))
}

export type RequestForAttestationWithAttesterAddress = Array<{
  requestForAttestation: sdk.IRequestForAttestation
  attesterAddress: sdk.IPublicIdentity['address']
}>

interface ISaveAction extends KiltAction {
  payload: {
    claimId: Entry['id']
    claim: sdk.IClaim
    meta: {
      alias: string
    }
  }
}

interface IRemoveAction extends KiltAction {
  payload: Entry['id']
}

interface IAddAttestedClaimAction extends KiltAction {
  payload: {
    claimId: Entry['id']
    attestedClaim: sdk.IAttestedClaim
  }
}

interface IRevokeAttestedClaimAction extends KiltAction {
  payload: {
    revokedHash: sdk.IAttestation['claimHash']
  }
}

interface IAddRequestForAttestationAction extends KiltAction {
  payload: {
    claimId: string
    requestForAttestation: sdk.IRequestForAttestation
    attesterAddress: sdk.IPublicIdentity['address']
  }
}

interface IRemoveRequestForAttestationAction extends KiltAction {
  payload: {
    claimId: Entry['id']
    rootHash: sdk.IRequestForAttestation['rootHash']
  }
}

export type Action =
  | ISaveAction
  | IRemoveAction
  | IAddAttestedClaimAction
  | IRevokeAttestedClaimAction
  | IAddRequestForAttestationAction
  | IRemoveRequestForAttestationAction

export type Entry = {
  id: string
  claim: sdk.IClaim
  attestedClaims: sdk.IAttestedClaim[]
  requestForAttestations: RequestForAttestationWithAttesterAddress
  meta: {
    alias: string
  }
}

type State = {
  claims: Immutable.Map<string, Entry>
}

export type ImmutableState = Immutable.Record<State>

export type SerializedState = {
  claims: Array<{
    id: string
    claim: string
    meta: object
    requestForAttestations: string
    attestedClaims: string
  }>
}

class Store {
  public static serialize(state: ImmutableState): SerializedState {
    const serialized: SerializedState = {
      claims: [],
    }

    serialized.claims = state
      .get('claims')
      .toList()
      .map(claimEntry => {
        return {
          attestedClaims: JSON.stringify(claimEntry.attestedClaims),
          claim: JSON.stringify(claimEntry.claim),
          requestForAttestations: JSON.stringify(
            claimEntry.requestForAttestations
          ),
          id: claimEntry.id,
          meta: claimEntry.meta,
        }
      })
      .toArray()

    return serialized
  }

  public static deserialize(
    claimsStateSerialized: SerializedState
  ): ImmutableState {
    if (!claimsStateSerialized) {
      return Store.createState({
        claims: Immutable.Map(),
      })
    }

    const claims = {}

    Object.keys(claimsStateSerialized.claims).forEach(i => {
      const o = claimsStateSerialized.claims[i]
      try {
        const claim = JSON.parse(o.claim) as sdk.IClaim
        const attestedClaims: sdk.IAttestedClaim[] = o.attestedClaims
          ? (JSON.parse(o.attestedClaims) as sdk.IAttestedClaim[])
          : []
        const requestForAttestations: RequestForAttestationWithAttesterAddress = o.requestForAttestations
          ? JSON.parse(o.requestForAttestations)
          : []
        const entry = {
          attestedClaims,
          requestForAttestations,
          claim,
          id: o.id,
          meta: o.meta,
        } as Entry
        claims[o.id] = entry
      } catch (error) {
        errorService.log({
          error,
          message: 'Could not restore Claims from local storage',
          origin: 'Claims.Store.deserialize()',
        })
      }
    })

    return Store.createState({
      claims: Immutable.Map(claims),
    })
  }

  public static reducer(
    state: ImmutableState = Store.createState(),
    action: Action
  ): ImmutableState {
    switch (action.type) {
      case Store.ACTIONS.CLAIM_SAVE: {
        const { claimId, claim, meta } = (action as ISaveAction).payload

        return state.setIn(['claims', claimId], {
          attestedClaims: [],
          requestForAttestations: [],
          claim,
          id: claimId,
          meta,
        } as Entry)
      }
      case Store.ACTIONS.CLAIM_REMOVE: {
        return state.deleteIn(['claims', (action as IRemoveAction).payload])
      }
      case Store.ACTIONS.ATTESTED_CLAIM_ADD: {
        const {
          claimId,
          attestedClaim,
        } = (action as IAddAttestedClaimAction).payload

        let attestedClaims =
          state.getIn(['claims', claimId, 'attestedClaims']) || []
        attestedClaims = attestedClaims.filter(
          (_attestedClaims: sdk.IAttestedClaim) =>
            !Store.areAttestedClaimsEqual(attestedClaim, _attestedClaims)
        )

        return state.setIn(
          ['claims', claimId, 'attestedClaims'],
          [...attestedClaims, attestedClaim]
        )
      }

      case Store.ACTIONS.ATTESTED_CLAIM_REVOKE: {
        const { revokedHash } = (action as IRevokeAttestedClaimAction).payload
        const setIns: Array<Iterable<any>> = []

        let claims = state.get('claims')

        claims.forEach((myClaim: Entry, myClaimHash: string) => {
          if (myClaim.attestedClaims && myClaim.attestedClaims.length) {
            myClaim.attestedClaims.forEach(
              (attestedClaim: sdk.IAttestedClaim, index: number) => {
                if (attestedClaim.attestation.claimHash === revokedHash) {
                  // avoid changing claims while iterating
                  setIns.push([myClaimHash, 'attestedClaims', index, 'revoked'])
                }
              }
            )
          }
        })
        setIns.forEach((keyPath: Iterable<any>) => {
          claims = claims.setIn(keyPath, true)
        })
        return state.setIn(['claims'], claims)
      }
      case Store.ACTIONS.REQUEST_FOR_ATTESTATION_ADD: {
        const {
          requestForAttestation,
          attesterAddress,
          claimId,
        } = (action as IAddRequestForAttestationAction).payload

        let requestForAttestations =
          state.getIn(['claims', claimId, 'requestForAttestations']) || []

        requestForAttestations = requestForAttestations.filter(
          (_requestForAttestations: sdk.IRequestForAttestation) =>
            !Store.areRequestForAttestationsEqual(
              requestForAttestation,
              _requestForAttestations
            )
        )

        return state.setIn(
          ['claims', claimId, 'requestForAttestations'],
          [
            ...requestForAttestations,
            { requestForAttestation, attesterAddress },
          ]
        )
      }
      case Store.ACTIONS.REQUEST_FOR_ATTESTATION_REMOVE: {
        const {
          claimId,
          rootHash,
        } = (action as IRemoveRequestForAttestationAction).payload
        const setIns: Array<Iterable<any>> = []
        let claims = state.get('claims')

        claims.forEach((entry: Entry, myClaimHash: string) => {
          if (entry.id === claimId) {
            entry.requestForAttestations.forEach(
              (requestForAttestationEntry, index: number) => {
                if (
                  requestForAttestationEntry.requestForAttestation.rootHash ===
                  rootHash
                ) {
                  setIns.push([myClaimHash, 'requestForAttestations', index])
                }
              }
            )
          }
        })

        setIns.forEach((keyPath: Iterable<any>) => {
          claims = claims.deleteIn(keyPath)
        })
        return state.setIn(['claims'], claims)
      }
      default:
        return state
    }
  }

  public static saveAction(
    claim: sdk.IClaim,
    meta: Entry['meta']
  ): ISaveAction {
    return {
      payload: {
        claim,
        claimId: hash(claim),
        meta,
      },
      type: Store.ACTIONS.CLAIM_SAVE,
    }
  }

  public static removeAction(claimId: Entry['id']): IRemoveAction {
    return {
      payload: claimId,
      type: Store.ACTIONS.CLAIM_REMOVE,
    }
  }

  public static addAttestedClaim(
    attestedClaim: sdk.IAttestedClaim
  ): IAddAttestedClaimAction {
    return {
      payload: {
        claimId: hash(attestedClaim.request.claim),
        attestedClaim,
      },
      type: Store.ACTIONS.ATTESTED_CLAIM_ADD,
    }
  }

  public static revokeAttestation(
    revokedHash: sdk.IAttestedClaim['request']['rootHash']
  ): IRevokeAttestedClaimAction {
    return {
      payload: { revokedHash },
      type: Store.ACTIONS.ATTESTED_CLAIM_REVOKE,
    }
  }

  public static addRequestForAttestation(
    requestForAttestation: sdk.IRequestForAttestation,
    attesterAddress: sdk.IPublicIdentity['address']
  ): IAddRequestForAttestationAction {
    return {
      payload: {
        claimId: hash(requestForAttestation.claim),
        requestForAttestation,
        attesterAddress,
      },
      type: Store.ACTIONS.REQUEST_FOR_ATTESTATION_ADD,
    }
  }

  public static removeRequestForAttestation(
    claimId: Entry['id'],
    rootHash: sdk.RequestForAttestation['rootHash']
  ): IRemoveRequestForAttestationAction {
    return {
      payload: { claimId, rootHash },
      type: Store.ACTIONS.REQUEST_FOR_ATTESTATION_REMOVE,
    }
  }

  public static createState(obj?: State): ImmutableState {
    return Immutable.Record({
      claims: Immutable.Map<string, Entry>(),
    })(obj)
  }

  private static ACTIONS = {
    ATTESTED_CLAIM_ADD: 'client/claims/ATTESTED_CLAIM_ADD',
    ATTESTED_CLAIM_REVOKE: 'client/claims/ATTESTED_CLAIM_REVOKE',
    CLAIM_REMOVE: 'client/claims/CLAIM_REMOVE',
    CLAIM_SAVE: 'client/claims/CLAIM_SAVE',
    REQUEST_FOR_ATTESTATION_ADD: 'client/claims/REQUEST_FOR_ATTESTATION_ADD',
    REQUEST_FOR_ATTESTATION_REMOVE:
      'client/claims/REQUEST_FOR_ATTESTATION_REMOVE',
  }

  private static areAttestedClaimsEqual(
    attestedClaim1: sdk.IAttestedClaim,
    attestedClaim2: sdk.IAttestedClaim
  ): boolean {
    return (
      attestedClaim1.attestation.owner === attestedClaim2.attestation.owner &&
      attestedClaim1.attestation.claimHash ===
        attestedClaim2.attestation.claimHash
    )
  }

  private static areRequestForAttestationsEqual(
    requestForAttestation1: sdk.IRequestForAttestation,
    requestForAttestation2: sdk.IRequestForAttestation
  ): boolean {
    return requestForAttestation1.rootHash === requestForAttestation2.rootHash
  }
}

const getAllClaims = (state: ReduxState): Entry[] => {
  return state.claims
    .get('claims')
    .toList()
    .toArray()
}

const getClaims = createSelector(
  [Wallet.getSelectedIdentity, getAllClaims],
  (selectedIdentity: IMyIdentity, entries: Entry[]) => {
    return entries.filter((entry: Entry) => {
      return (
        entry &&
        entry.claim &&
        entry.claim.owner === selectedIdentity.identity.address
      )
    })
  }
)

const getCTypeHash = (
  state: ReduxState,
  cTypeHash: ICType['cType']['hash']
): ICType['cType']['hash'] => cTypeHash

const getClaimsByCTypeHash = createSelector(
  [getClaims, getCTypeHash],
  (entries: Entry[], cTypeHash: ICType['cType']['hash']) =>
    entries.filter((entry: Entry) => entry.claim.cTypeHash === cTypeHash)
)

const getClaimHash = (state: ReduxState, claim: sdk.IPartialClaim): string =>
  hash(claim)

const getClaim = createSelector(
  [getClaimHash, getClaims],
  (claimHash: string, entries: Entry[]) => {
    return entries.find((entry: Entry) => entry.id === claimHash)
  }
)

export { Store, getClaims, getClaimsByCTypeHash, getClaim, hash }
