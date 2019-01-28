import React, { Component } from 'react'
import { connect } from 'react-redux'

import * as UiState from '../../state/ducks/UiState'
import { BlockUi as IBlockUi } from '../../types/UserFeedback'

import './BlockUi.scss'

type Props = {
  blockUis: IBlockUi[]
}

type State = {}

class BlockUi extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
  }

  public render() {
    const { blockUis } = this.props

    return !!blockUis && !!blockUis.length ? (
      <section className="BlockUi">
        <div className="backdrop" />
        <div className="container">
          {blockUis.map((blockUi: IBlockUi) => this.getBlockUi(blockUi))}
        </div>
        <div className="spinner">
          <div className="lds-ring">
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      </section>
    ) : (
      ''
    )
  }

  private getBlockUi(blockUi: IBlockUi) {
    return (
      <div key={blockUi.id} className="blockUi">
        {blockUi.headline && <header>{blockUi.headline}</header>}
        {blockUi.message && <div>{blockUi.message}</div>}
      </div>
    )
  }
}

const mapStateToProps = (state: { uiState: UiState.ImmutableState }) => {
  return {
    blockUis: state.uiState
      .get('blockUis')
      .toList()
      .toArray()
      .sort((a: IBlockUi, b: IBlockUi) => a.created - b.created),
  }
}

export default connect(mapStateToProps)(BlockUi)