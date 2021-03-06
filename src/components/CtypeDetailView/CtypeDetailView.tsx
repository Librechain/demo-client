import React from 'react'
import { Link } from 'react-router-dom'
import CTypeRepository from '../../services/CtypeRepository'

import { ICType, ICTypeWithMetadata } from '../../types/Ctype'
import Code from '../Code/Code'
import ContactPresentation from '../ContactPresentation/ContactPresentation'
import CTypePresentation from '../CTypePresentation/CTypePresentation'

import './CtypeDetailView.scss'

type Props = {
  cTypeHash: ICType['cType']['hash']
}

type State = {
  cType?: ICTypeWithMetadata
}

class CtypeDetailView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {}
  }

  public componentDidMount(): void {
    const { cTypeHash } = this.props
    CTypeRepository.findByHash(cTypeHash).then((_cType: ICTypeWithMetadata) => {
      this.setState({ cType: _cType })
    })
  }

  public render(): JSX.Element {
    const { cTypeHash } = this.props
    const { cType } = this.state

    return (
      <section className="CtypeDetailView">
        {cType ? (
          <>
            <div className="attributes">
              <div>
                <label>Title</label>
                <div>{cType.metaData.metadata.title.default}</div>
              </div>
              <div>
                <label>Author</label>
                <div>
                  {cType.cType.owner && (
                    <ContactPresentation
                      address={cType.cType.owner}
                      interactive
                    />
                  )}
                </div>
              </div>
              <div>
                <label>Definition</label>
                <div>
                  <Code>{cType.cType}</Code>
                </div>
              </div>
              <div>
                <label>Metadata</label>
                <div>
                  <Code>{cType.metaData.metadata}</Code>
                </div>
              </div>
              <CTypePresentation cTypeHash={cTypeHash} size={50} />
            </div>
            <div className="actions">
              <Link to="/cType">Cancel</Link>
              <Link to={`/claim/new/${cTypeHash}`}>New Claim</Link>
            </div>
          </>
        ) : (
          <div>Given CTYPE key is not valid.</div>
        )}
      </section>
    )
  }
}

export default CtypeDetailView
