import * as sdk from '@kiltprotocol/sdk-js'
import { IPartialClaim } from '@kiltprotocol/sdk-js'

import RequestForAttestationService from '../../services/RequestForAttestationService'
import AttestationService from '../../services/AttestationService'
import ContactRepository from '../../services/ContactRepository'
import MessageRepository from '../../services/MessageRepository'
import * as Claims from '../../state/ducks/Claims'
import * as Attestations from '../../state/ducks/Attestations'
import { IMyDelegation } from '../../state/ducks/Delegations'
import PersistentStore from '../../state/PersistentStore'
import { IMyIdentity } from '../../types/Contact'
import { ICTypeWithMetadata } from '../../types/Ctype'
import { BsClaim, BsClaimsPool, BsClaimsPoolElement } from './DevTools.claims'
import { BsCType } from './DevTools.ctypes'
import { BsDelegation, BsDelegationsPool } from './DevTools.delegations'
import { BsIdentitiesPool, BsIdentity } from './DevTools.wallet'

import attestationsPool from './data/attestations.json'

type UpdateCallback = (bsAttestationKey: keyof BsAttestationsPool) => void

type BsAttestationsPoolElement = {
  attest: {
    attesterKey: keyof BsIdentitiesPool
    terms?: Array<keyof BsAttestationsPool>
    delegationKey?: keyof BsDelegationsPool
  }
  claimKey: keyof BsClaimsPool
  then?: BsAttestationsPool
}

export type BsAttestationsPool = {
  [attestationKey: string]: BsAttestationsPoolElement
}

type BsAttestedClaims = {
  [attestationKey: string]: sdk.AttestedClaim
}

class BsAttestation {
  public static pool: BsAttestationsPool = attestationsPool as BsAttestationsPool

  public static async createAttestation(
    bsAttestationData: BsAttestationsPoolElement,
    bsAttestationKey: keyof BsAttestationsPool,
    bsAttestedClaims: BsAttestedClaims,
    withMessages: boolean,
    updateCallback?: UpdateCallback
  ): Promise<void> {
    const { attest, claimKey, then } = bsAttestationData
    const { attesterKey } = attest

    if (!claimKey || !attest || !attesterKey) {
      throw new Error(`Invalid attestation data`)
    }

    const bsClaim: BsClaimsPoolElement = await BsClaim.getBsClaimByKey(claimKey)
    const claimerIdentity: IMyIdentity = await BsIdentity.getByKey(
      bsClaim.claimerKey
    )

    if (updateCallback) {
      updateCallback(bsAttestationKey)
    }

    // get claim to attest
    // for this we take the role of the claimer
    BsIdentity.selectIdentity(claimerIdentity)
    const claimToAttest: Claims.Entry = await BsClaim.getClaimByKey(claimKey)

    const requestForAttestation: sdk.RequestForAttestation = await BsAttestation.getRequestForAttestation(
      bsAttestationData,
      claimToAttest,
      bsAttestedClaims,
      claimerIdentity
    )

    const attestedClaim: sdk.AttestedClaim = await BsAttestation.attesterAttestsClaim(
      bsAttestationData,
      bsAttestationKey,
      bsAttestedClaims,
      claimerIdentity,
      requestForAttestation
    )

    const attesterIdentity: IMyIdentity = await BsIdentity.getByKey(attesterKey)

    // import to claimers claim
    // therefore switch to claimer identity
    BsIdentity.selectIdentity(claimerIdentity)
    PersistentStore.store.dispatch(
      Claims.Store.addRequestForAttestation(
        requestForAttestation,
        attesterIdentity.identity.address
      )
    )
    PersistentStore.store.dispatch(Claims.Store.addAttestedClaim(attestedClaim))

    if (withMessages) {
      BsAttestation.sendMessages(
        bsAttestationData,
        claimerIdentity,
        bsClaim,
        requestForAttestation,
        attestedClaim
      )
    }

    // create dependent attestations
    if (then) {
      await BsAttestation.createAttestations(
        then,
        bsAttestedClaims,
        withMessages,
        updateCallback
      )
    }
  }

  public static async createAttestations(
    pool: BsAttestationsPool,
    bsAttestedClaims: BsAttestedClaims,
    withMessages: boolean,
    updateCallback?: UpdateCallback
  ): Promise<void> {
    const bsAttestationKeys = Object.keys(pool)
    const requests = bsAttestationKeys.reduce(
      (promiseChain, bsAttestationKey) => {
        return promiseChain.then(() => {
          return BsAttestation.createAttestation(
            pool[bsAttestationKey],
            bsAttestationKey,
            bsAttestedClaims,
            withMessages,
            updateCallback
          )
        })
      },
      Promise.resolve()
    )
    return requests
  }

  public static async create(
    withMessages: boolean,
    updateCallback?: UpdateCallback
  ): Promise<void> {
    return BsAttestation.createAttestations(
      BsAttestation.pool,
      {},
      withMessages,
      updateCallback
    )
  }

  private static async getRequestForAttestation(
    bsAttestationData: BsAttestationsPoolElement,
    claimToAttest: Claims.Entry,
    bsAttestedClaims: BsAttestedClaims,
    claimerIdentity: IMyIdentity
  ): Promise<sdk.RequestForAttestation> {
    const { attest } = bsAttestationData
    const { delegationKey, terms } = attest

    // resolve delegation
    let delegation: IMyDelegation | undefined
    if (delegationKey) {
      delegation = await BsDelegation.getDelegationByKey(delegationKey)
    }

    let termsFromPool: sdk.AttestedClaim[] = []
    if (terms && Array.isArray(terms) && terms.length) {
      termsFromPool = await Promise.all(
        terms.map(bsAttestationKey => {
          const bsAttestedClaim = bsAttestedClaims[bsAttestationKey]
          if (bsAttestedClaim) {
            return Promise.resolve(bsAttestedClaim)
          }
          throw new Error(
            `Could not find attestedClaim for key '${bsAttestationKey}'`
          )
        })
      )
    }

    const req4Att = await sdk.RequestForAttestation.fromClaimAndIdentity(
      claimToAttest.claim,
      claimerIdentity.identity,
      {
        legitimations: termsFromPool,
        delegationId: delegation ? delegation.id : undefined,
      }
    )

    return req4Att.message
  }

  /**
   * collection of attesters actions necessary for attesting
   *
   * @param bsAttestationData
   * @param bsAttestationKey
   * @param bsAttestedClaims
   * @param claimerIdentity
   * @param requestForAttestation
   */
  private static async attesterAttestsClaim(
    bsAttestationData: BsAttestationsPoolElement,
    bsAttestationKey: keyof BsAttestationsPool,
    bsAttestedClaims: BsAttestedClaims,
    claimerIdentity: IMyIdentity,
    requestForAttestation: sdk.RequestForAttestation
  ): Promise<sdk.AttestedClaim> {
    const { attest } = bsAttestationData
    const { attesterKey } = attest

    const attesterIdentity: IMyIdentity = await BsIdentity.getByKey(attesterKey)

    // for the following actions we need to take the role of the attester
    BsIdentity.selectIdentity(attesterIdentity)

    // create attested claim and store for reference
    const attestedClaim: sdk.AttestedClaim = await AttestationService.attestClaim(
      requestForAttestation
    )
    // TODO: Don't add the attested claim to the bsAttestedClaims array.
    // eslint-disable-next-line no-param-reassign
    bsAttestedClaims[bsAttestationKey] = attestedClaim

    // store attestation locally
    AttestationService.saveInStore({
      attestation: attestedClaim.attestation,
      cTypeHash: attestedClaim.request.claim.cTypeHash,
      claimerAddress: claimerIdentity.identity.address,
      claimerAlias: claimerIdentity.metaData.name,
      created: Date.now(),
    } as Attestations.Entry)

    return attestedClaim
  }

  private static async sendMessages(
    bsAttestationData: BsAttestationsPoolElement,
    claimerIdentity: IMyIdentity,
    bsClaim: BsClaimsPoolElement,
    requestForAttestation: sdk.RequestForAttestation,
    attestedClaim: sdk.AttestedClaim
  ): Promise<void> {
    const { attest } = bsAttestationData
    const { attesterKey } = attest

    const attesterIdentity: IMyIdentity = await BsIdentity.getByKey(attesterKey)
    const cType: ICTypeWithMetadata = await BsCType.getByKey(bsClaim.cTypeKey)

    const partialClaim: IPartialClaim = {
      cTypeHash: cType.cType.hash,
      contents: bsClaim.data,
      owner: claimerIdentity.identity.address,
    }

    // send request for term from claimer to attester
    const requestAcceptDelegation: sdk.IRequestTerms = {
      content: partialClaim,
      type: sdk.MessageBodyType.REQUEST_TERMS,
    }
    await MessageRepository.singleSend(
      requestAcceptDelegation,
      claimerIdentity,
      ContactRepository.getContactFromIdentity(attesterIdentity)
    )

    // send terms from attester to claimer
    const submitTerms: sdk.ISubmitTerms = {
      content: {
        claim: partialClaim,
        delegationId: attestedClaim.request.delegationId || undefined,
        legitimations: attestedClaim.request.legitimations,
        quote: undefined,
      },
      type: sdk.MessageBodyType.SUBMIT_TERMS,
    }
    await MessageRepository.singleSend(
      submitTerms,
      attesterIdentity,
      ContactRepository.getContactFromIdentity(claimerIdentity)
    )

    // send signed legitmations from claimer to attester
    const requestAttestationForClaim: sdk.IRequestAttestationForClaim = {
      content: { requestForAttestation },
      type: sdk.MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
    }

    RequestForAttestationService.saveInStore(
      requestForAttestation,
      attesterIdentity.identity.address
    )

    await MessageRepository.singleSend(
      requestAttestationForClaim,
      claimerIdentity,
      ContactRepository.getContactFromIdentity(attesterIdentity)
    )

    // send attested claim from attester to claimer
    const submitAttestationForClaim: sdk.ISubmitAttestationForClaim = {
      content: attestedClaim,
      type: sdk.MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }
    await MessageRepository.singleSend(
      submitAttestationForClaim,
      attesterIdentity,
      ContactRepository.getContactFromIdentity(claimerIdentity)
    )
  }
}

export { BsAttestation }
