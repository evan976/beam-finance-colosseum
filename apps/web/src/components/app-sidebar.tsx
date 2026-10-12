'use client'

import type * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@beam/ui/components/sidebar'
import {
  ArrowLeftRight,
  Banknote,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Users,
  Vault,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'

const adminNav = [
  { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> },
  { title: 'Treasury', href: '/treasury', icon: <Vault /> },
  { title: 'Employees', href: '/employees', icon: <Users /> },
  { title: 'Payroll', href: '/payroll', icon: <Banknote /> },
  { title: 'Reimbursements', href: '/reimbursements', icon: <Receipt /> },
  { title: 'Transfers', href: '/transfers', icon: <ArrowLeftRight /> },
  { title: 'History', href: '/history', icon: <ScrollText /> },
]

const employeeNav = [
  { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> },
  { title: 'My Salary', href: '/payroll', icon: <Banknote /> },
  { title: 'My Reimbursements', href: '/reimbursements', icon: <Receipt /> },
  { title: 'Transfers', href: '/transfers', icon: <ArrowLeftRight /> },
  { title: 'History', href: '/history', icon: <ScrollText /> },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  isAdmin: boolean
  treasuryName?: string
}

export function AppSidebar({
  isAdmin,
  treasuryName,
  ...props
}: AppSidebarProps) {
  const navItems = isAdmin ? adminNav : employeeNav

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/logo-square.svg"
              alt="Beam Finance"
              width={32}
              height={32}
              className="dark:invert"
            />
            <span className="hidden font-bold text-lg uppercase md:block">
              Beam Finance
            </span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-4">
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser isAdmin={isAdmin} />
      </SidebarFooter>
    </Sidebar>
  )
}
