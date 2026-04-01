'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[]
  setItems: (items: BreadcrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  items: [],
  setItems: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([])

  return (
    <BreadcrumbContext.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

/**
 * Hook to register breadcrumb items from any page/component.
 * Items are automatically cleaned up when the component unmounts.
 * 
 * Usage:
 *   useBreadcrumbs([
 *     { label: 'Colecciones', href: '/collections' },
 *     { label: 'Mi Colección' },
 *   ])
 */
export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const { setItems } = useContext(BreadcrumbContext)
  const serialized = JSON.stringify(items)

  useEffect(() => {
    setItems(items)
    return () => setItems([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setItems])
}

export function useBreadcrumbItems(): BreadcrumbItem[] {
  return useContext(BreadcrumbContext).items
}
