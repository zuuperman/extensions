import React from "react"
import classNames from "classnames"
import { Paragraph } from "@contentful/forma-36-react-components"
import "./switch.css"

export default function Switch({ checked, onChange, children }) {
  return (
    <main className="switch-field">
      <aside
        onClick={() => onChange(!checked)}
        className={classNames(`check`, {
          checked
        })}
      />
      <Paragraph>{children}</Paragraph>
    </main>
  )
}
