import React from 'react'
import Input from '@/components/atoms/Input'

export default function FormField({ label, name, icon, error, hint, ...props }) {
  return (
    <div className="w-full">
      <Input
        label={label}
        name={name}
        icon={icon}
        error={error}
        hint={hint}
        {...props}
      />
    </div>
  )
}
