import React from 'react'

import FeedbackService from '../../services/FeedbackService'
import { BsAttestation, BsAttestationsPool } from './DevTools.attestations'
import { BsClaim, BsClaimsPool } from './DevTools.claims'
import { BsCType, BsCTypesPool } from './DevTools.ctypes'
import { BsDelegation, BsDelegationsPool } from './DevTools.delegations'
import { BsIdentitiesPool, BsIdentity } from './DevTools.wallet'

type WithMessages = {
  label: string
  with: boolean
}

type Props = {}

class DevTools extends React.Component<Props> {
  public render() {
    const withMessages: WithMessages[] = [
      { label: 'Without messages', with: false },
      { label: 'With messages', with: true },
    ]

    return (
      <section className="DevTools">
        <h2>Dev Tools</h2>

        <div>
          <div>
            <h4>Auto Bootstrap</h4>
            {withMessages.map((messages: WithMessages) => (
              <button
                key={messages.label}
                onClick={this.bootstrapAll.bind(this, messages.with)}
              >
                {messages.label}
              </button>
            ))}
          </div>
          {withMessages.map((messages: WithMessages) => (
            <div key={messages.label}>
              <h4>{`Manual Bootstrap ${messages.label}`}</h4>
              <button onClick={this.bootstrapIdentities}>Identities</button>
              <button onClick={this.bootstrapCTypes}>CTypes</button>
              <button onClick={this.bootstrapClaims}>Claims</button>
              <button
                onClick={this.bootstrapDelegations.bind(this, messages.with)}
              >
                Delegations
              </button>
              <button onClick={this.bootstrapPCRs.bind(this, messages.with)}>
                PCRs
              </button>
              <button
                onClick={this.bootstrapAttestations.bind(this, messages.with)}
              >
                Attestations
              </button>
            </div>
          ))}
        </div>
      </section>
    )
  }

  private async bootstrapIdentities() {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating identities',
    })

    await BsIdentity.createPool((bsIdentityKey: keyof BsIdentitiesPool) => {
      blockUi.updateMessage(`Creating: ${bsIdentityKey}`)
    }).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapCTypes() {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating cTypes',
    })

    await BsCType.savePool((bsCTypeKey: keyof BsCTypesPool) => {
      blockUi.updateMessage(`Creating: ${bsCTypeKey}`)
    }).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapClaims() {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating claims',
    })

    await BsClaim.savePool((bsClaimKey: keyof BsClaimsPool) => {
      blockUi.updateMessage(`creating claim: ${bsClaimKey}`)
    }).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapDelegations(withMessages = false) {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating delegations',
    })

    await BsDelegation.create(
      false,
      withMessages,
      (bsDelegationKey: keyof BsDelegationsPool) => {
        blockUi.updateMessage(`Creating: ${bsDelegationKey}`)
      }
    ).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapPCRs(withMessages = false) {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating PCRs',
    })

    await BsDelegation.create(
      true,
      withMessages,
      (bsDelegationKey: keyof BsDelegationsPool) => {
        blockUi.updateMessage(`Creating: ${bsDelegationKey}`)
      }
    ).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapAttestations(withMessages = false) {
    const blockUi = FeedbackService.addBlockUi({
      headline: 'Creating legitimations & attestations',
    })

    await BsAttestation.create(
      withMessages,
      (bsAttestationKey: keyof BsAttestationsPool) => {
        blockUi.updateMessage(`Creating: ${bsAttestationKey}`)
      }
    ).then(() => {
      blockUi.remove()
    })
  }

  private async bootstrapAll(withMessages = false) {
    await this.bootstrapIdentities()
    await this.bootstrapCTypes()
    await this.bootstrapClaims()
    await this.bootstrapDelegations(withMessages)
    await this.bootstrapPCRs(withMessages)
    await this.bootstrapAttestations(withMessages)
  }
}

export default DevTools