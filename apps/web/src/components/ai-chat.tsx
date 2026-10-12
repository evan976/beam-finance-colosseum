'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { useChat } from '@ai-sdk/react'
import { Button } from '@beam/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@beam/ui/components/sheet'
import { Spinner } from '@beam/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@beam/ui/components/tooltip'
import { useIsMobile } from '@beam/ui/hooks/use-mobile'
import { cn } from '@beam/ui/lib/utils'
import type { UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import { Bot, Check, ExternalLink, TrashIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { type AgentAction, useAgentActions } from '@/hooks/use-agent-actions'
import { useAiContext } from '@/hooks/use-ai-context'
import { getExplorerUrl, TOKEN_SYMBOL } from '@/lib/constants'

function getToolActions(msg: UIMessage): AgentAction[] {
  const actions: AgentAction[] = []
  for (const part of msg.parts) {
    if (
      'type' in part &&
      typeof part.type === 'string' &&
      part.type.startsWith('tool-') &&
      'output' in part &&
      part.output &&
      typeof part.output === 'object' &&
      'requiresConfirmation' in part.output
    ) {
      actions.push(part.output as AgentAction)
    }
  }
  return actions
}

function ActionCard({
  action,
  onConfirm,
}: {
  action: AgentAction
  onConfirm: (action: AgentAction) => Promise<string>
}) {
  const [state, setState] = React.useState<
    'idle' | 'executing' | 'success' | 'error' | 'dismissed'
  >('idle')
  const [txSig, setTxSig] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const handleConfirm = async () => {
    setState('executing')
    try {
      const sig = await onConfirm(action)
      setTxSig(sig)
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }

  const actionLabels: Record<string, string> = {
    add_employee: 'Add Employee',
    remove_employee: 'Remove Employee',
    pay_salary: 'Pay Salary',
    transfer_from_treasury: 'Treasury Transfer',
    transfer_p2p: 'P2P Transfer',
    submit_reimbursement: 'Submit Reimbursement',
    approve_reimbursement: 'Approve',
    reject_reimbursement: 'Reject',
  }

  return (
    <div className="mt-2 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {actionLabels[action.action] ?? action.action}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-sm">{action.label}</p>
      <p className="mt-0.5 text-muted-foreground text-xs">{action.reason}</p>

      {state === 'idle' && (
        <div className="mt-2.5 flex gap-2">
          <Button size="xs" onClick={handleConfirm}>
            Confirm & Sign
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setState('dismissed')}
          >
            Dismiss
          </Button>
        </div>
      )}

      {state === 'executing' && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
          <Spinner className="size-3" />
          Awaiting wallet signature...
        </div>
      )}

      {state === 'success' && (
        <div className="mt-2 flex items-center gap-1.5 text-emerald-600 text-xs dark:text-emerald-400">
          <Check className="size-3.5" />
          Transaction confirmed
          {txSig && (
            <a
              href={getExplorerUrl(txSig)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-0.5 underline"
            >
              View
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="mt-2 space-y-1">
          <p className="text-destructive text-xs">Transaction failed</p>
          {errorMsg && (
            <p className="line-clamp-2 text-[10px] text-muted-foreground">
              {errorMsg}
            </p>
          )}
          <Button size="xs" variant="outline" onClick={handleConfirm}>
            Retry
          </Button>
        </div>
      )}

      {state === 'dismissed' && (
        <p className="mt-2 text-muted-foreground text-xs">Dismissed</p>
      )}
    </div>
  )
}

const adminSuggestions = [
  'Treasury balance & spending overview',
  'Any pending reimbursements?',
  'Pay salary for all employees',
  'Add a new employee',
]

const employeeSuggestions = [
  'My payroll history',
  'Submit a reimbursement',
  'Check my reimbursement status',
  'Transfer funds to a teammate',
]

interface AiChatProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AiChatContent({
  messages,
  status,
  isStreaming,
  showThinking,
  input,
  setInput,
  setMessages,
  aiContext,
  handleSubmit,
  handleSuggestionClick,
  handleActionConfirm,
  onClose,
}: {
  messages: UIMessage[]
  status: ReturnType<typeof useChat>['status']
  isStreaming: boolean
  showThinking: boolean
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  setMessages: ReturnType<typeof useChat>['setMessages']
  aiContext: ReturnType<typeof useAiContext>
  handleSubmit: (message: PromptInputMessage) => void
  handleSuggestionClick: (suggestion: string) => void
  handleActionConfirm: (action: AgentAction) => Promise<string>
  onClose: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p id="ai-chat-title" className="font-semibold text-sm">
              Beam AI
            </p>
            <p className="text-muted-foreground text-xs">Financial Assistant</p>
          </div>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      React.startTransition(() => {
                        setMessages([])
                      })
                    }}
                    aria-label="Clear chat"
                  />
                }
              >
                <TrashIcon aria-hidden="true" className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Clear chat</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={onClose}
                  aria-label="Close chat"
                />
              }
            >
              <X aria-hidden="true" className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <Bot
                  aria-hidden="true"
                  className="size-8 text-muted-foreground"
                />
              }
              title="How can I help you?"
              description="Ask me about your treasury, payroll, reimbursements, or transfers."
            />
          ) : (
            <>
              {messages.map((msg) => {
                const actions = getToolActions(msg)

                return (
                  <Fragment key={msg.id}>
                    <Message from={msg.role}>
                      <MessageContent>
                        {msg.parts.map((part, i) => {
                          if (part.type === 'text') {
                            return (
                              <MessageResponse
                                key={`${msg.id}-${i}`}
                                isAnimating={
                                  isStreaming &&
                                  msg.id === messages[messages.length - 1]?.id
                                }
                              >
                                {part.text}
                              </MessageResponse>
                            )
                          }
                          return null
                        })}
                      </MessageContent>
                    </Message>
                    {actions.map((action, idx) => (
                      <ActionCard
                        key={
                          action.targetId ??
                          action.employeeWallet ??
                          action.recipient ??
                          idx
                        }
                        action={action}
                        onConfirm={handleActionConfirm}
                      />
                    ))}
                  </Fragment>
                )
              })}
              {showThinking && (
                <Message from="assistant">
                  <MessageContent>
                    <Shimmer className="text-sm" duration={1.5}>
                      Thinking...
                    </Shimmer>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-3 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {messages.length === 0 && (
          <Suggestions className="px-1">
            {(aiContext?.raw.isAdmin
              ? adminSuggestions
              : employeeSuggestions
            ).map((s) => (
              <Suggestion
                key={s}
                suggestion={s}
                onClick={handleSuggestionClick}
              />
            ))}
          </Suggestions>
        )}
        <PromptInput onSubmit={handleSubmit} className="rounded-xl border">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="min-h-10"
          />
          <PromptInputFooter className="justify-end p-2">
            <PromptInputSubmit
              disabled={
                !input.trim() &&
                status !== 'streaming' &&
                status !== 'submitted'
              }
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )
}

export function AiChat({ open, onOpenChange }: AiChatProps) {
  const aiContext = useAiContext()
  const isMobile = useIsMobile()
  const { executeAction } = useAgentActions()
  const [input, setInput] = React.useState('')

  const contextRef = React.useRef(aiContext)
  contextRef.current = aiContext

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
          context: contextRef.current
            ? {
                summary: contextRef.current.summary,
                raw: contextRef.current.raw,
                tokenSymbol: TOKEN_SYMBOL,
              }
            : undefined,
        }),
      }),
    [],
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  })

  const isStreaming = status === 'streaming'
  const isLoading = status === 'submitted' || status === 'streaming'

  const lastMessage = messages[messages.length - 1]
  const lastPart =
    lastMessage?.role === 'assistant'
      ? lastMessage.parts[lastMessage.parts.length - 1]
      : undefined
  const isToolRunning = lastPart != null && lastPart.type !== 'text'

  const showThinking =
    isLoading && (lastMessage?.role === 'user' || isToolRunning)

  const handleSubmit = React.useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim()) return
      sendMessage({ text: message.text })
      setInput('')
    },
    [sendMessage],
  )

  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      sendMessage({ text: suggestion })
    },
    [sendMessage],
  )

  const handleActionConfirm = React.useCallback(
    async (action: AgentAction): Promise<string> => {
      const sig = await executeAction(action)
      toast.success(`"${action.label}" executed`, {
        description: 'Transaction confirmed on-chain.',
      })
      return sig
    },
    [executeAction],
  )

  const closeChat = React.useCallback(() => {
    React.startTransition(() => {
      onOpenChange(false)
    })
  }, [onOpenChange])

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full max-w-none p-0 sm:max-w-md"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Beam AI</SheetTitle>
            <SheetDescription>
              Ask about your treasury, payroll, reimbursements, or transfers.
            </SheetDescription>
          </SheetHeader>
          <div className="flex h-full min-h-0 flex-col">
            <AiChatContent
              messages={messages}
              status={status}
              isStreaming={isStreaming}
              showThinking={showThinking}
              input={input}
              setInput={setInput}
              setMessages={setMessages}
              aiContext={aiContext}
              handleSubmit={handleSubmit}
              handleSuggestionClick={handleSuggestionClick}
              handleActionConfirm={handleActionConfirm}
              onClose={closeChat}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'hidden h-[calc(100svh-1rem)] min-h-0 shrink-0 self-start overflow-hidden rounded-xl border bg-background shadow-sm transition-[width,margin,box-shadow,border-color] duration-200 ease-linear lg:flex',
        open
          ? 'my-2 mr-2 w-96'
          : 'my-0 mr-0 w-0 border-transparent shadow-none',
      )}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="ai-chat-title"
        className={cn(
          'flex h-full min-h-0 w-96 flex-1 flex-col transition-transform duration-200 ease-out',
          open
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-6 opacity-0',
        )}
      >
        <AiChatContent
          messages={messages}
          status={status}
          isStreaming={isStreaming}
          showThinking={showThinking}
          input={input}
          setInput={setInput}
          setMessages={setMessages}
          aiContext={aiContext}
          handleSubmit={handleSubmit}
          handleSuggestionClick={handleSuggestionClick}
          handleActionConfirm={handleActionConfirm}
          onClose={closeChat}
        />
      </div>
    </aside>
  )
}
