import * as React from 'react'
import ReactJson from 'react-json-view'

import './Code.scss'

type Props = {
  collapsed?: boolean | number
}

type State = {}

class Code extends React.Component<Props, State> {
  public render() {
    const { children, collapsed } = this.props
    return (
      <ReactJson
        src={children as object}
        name={false}
        theme="monokai"
        collapsed={collapsed != null ? collapsed : 1}
        collapseStringsAfterLength={30}
        enableClipboard={false}
        displayDataTypes={false}
      />
    )
  }
}

export default Code
