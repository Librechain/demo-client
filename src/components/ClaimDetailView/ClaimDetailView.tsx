import * as sdk from '@kiltprotocol/prototype-sdk'
import React, { Component } from 'react'

import Code from '../Code/Code'
import ContactPresentation from '../ContactPresentation/ContactPresentation'

import './ClaimDetailView.scss'

type Props = {
  claim: sdk.IClaim
}

type State = {}

class ClaimDetailView extends Component<Props, State> {
  public render() {
    const { claim }: Props = this.props

    return (
      <section className="ClaimDetailView">
        <div>
          <label>Ctype</label>
          <div>{claim.cType}</div>
        </div>
        {claim.owner && (
          <div>
            <label>Owner</label>
            <div>
              <ContactPresentation address={claim.owner} />
            </div>
          </div>
        )}
        {claim.contents && (
          <div>
            <label>Contents</label>
            <div>
              <Code>{claim.contents}</Code>
            </div>
          </div>
        )}
      </section>
    )
  }
}

export default ClaimDetailView
