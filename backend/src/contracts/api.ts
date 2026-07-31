export const API_ERROR_CODES = [
    "ALREADY_MEMBER",
    "CONFLICT",
    "DATA_INTEGRITY_ERROR",
    "EMAIL_EXISTS",
    "FORBIDDEN",
    "FX_UNAVAILABLE",
    "INTERNAL_ERROR",
    "INVITE_EXPIRED",
    "INVITE_NOT_FOUND",
    "NOT_FOUND",
    "UNAUTHENTICATED",
    "VALIDATION_ERROR"
] as const

export type ApiErrorCode = typeof API_ERROR_CODES[number]
export type MoneyString = string
export type CurrencyCode = string
export type CalendarDate = string
export type UtcTimestamp = string

export interface SuccessResponse<T> {
    status: "success"
    data: T
}

export interface FailureResponse {
    status: "fail"
    code: ApiErrorCode
    message: string
    fields?: Record<string, string>
}

export type ApiResponse<T> = SuccessResponse<T> | FailureResponse

export interface CredentialsRequest {
    email: string
    password: string
}

export interface MessageData {
    message: string
}

export interface UserIdentity {
    userId: string
    email: string
}

export interface LoginData {
    user: UserIdentity
}

export interface SessionData {
    userId: string
}

export interface CreateGroupRequest {
    groupName: string
    groupUserName: string
    defaultCurrency: CurrencyCode
}

export interface CreateGroupData {
    groupId: string
    message: string
    defaultCurrency: CurrencyCode
}

export interface GroupMember {
    userId: string
    userGroupName: string
}

export interface GroupSummary {
    groupId: string
    groupName: string
    groupMembers: GroupMember[]
    defaultCurrency: CurrencyCode
}

export interface GroupListData {
    userId: string
    groups: GroupSummary[]
}

export interface GroupData {
    groupName: string
    defaultCurrency: CurrencyCode
}

export interface GroupMembersData {
    members: GroupMember[]
}

export interface InviteData {
    inviteUrl: string
}

export interface JoinGroupRequest {
    userName: string
}

export interface JoinGroupData {
    groupId: string
}

export interface ExpenseEntryRequest {
    userId: string
    amount: MoneyString | number
}

export interface CreateExpenseRequest {
    groupId: string
    expenseName: string
    expenseTotal: MoneyString
    expenseDate: CalendarDate
    expenseCurrency: CurrencyCode
    paidBy: ExpenseEntryRequest[]
    splits: ExpenseEntryRequest[]
}

export interface CreateExpenseData {
    expenseId: string
}

export interface ExpenseSummary {
    expenseId: string
    groupId: string
    expenseName: string
    expenseTotal: MoneyString
    date: CalendarDate
    createdAt: UtcTimestamp
    currency: CurrencyCode
}

export interface ExpenseListData {
    expenses: ExpenseSummary[]
}

export interface DeleteExpenseData {
    expenseId: string
}

export interface Repayment {
    repaymentId: string
    groupId: string
    payerUserId: string
    receiverUserId: string
    amount: MoneyString
    currency: CurrencyCode
    repaymentDate: CalendarDate
    recordedByUserId: string
    createdAt: UtcTimestamp
}

export interface CreateRepaymentRequest {
    payerUserId: string
    receiverUserId: string
    amount: MoneyString
    repaymentDate: CalendarDate
}

export interface RepaymentListData {
    repayments: Repayment[]
}

export interface CreateRepaymentData {
    repayment: Repayment
}

export interface DeleteRepaymentData {
    repaymentId: string
}

export interface BalanceEntry {
    userId: string
    amount: MoneyString
}

export interface SettlementSuggestion {
    payerUserId: string
    receiverUserId: string
    amount: MoneyString
}

export interface BalanceData {
    currency: CurrencyCode
    balances: BalanceEntry[]
    settlements: SettlementSuggestion[]
}

export interface ApiEndpoint {
    id: string
    method: "DELETE" | "GET" | "POST"
    path: string
    state: "active" | "planned"
}

export const API_ENDPOINTS = [
    { id: "signup", method: "POST", path: "/api/users/signup", state: "active" },
    { id: "login", method: "POST", path: "/api/users/login", state: "active" },
    { id: "logout", method: "POST", path: "/api/users/logout", state: "active" },
    { id: "session", method: "GET", path: "/api/users/verifysession", state: "active" },
    { id: "createGroup", method: "POST", path: "/api/groups/addgroup", state: "active" },
    { id: "listGroups", method: "GET", path: "/api/groups/grouplist", state: "active" },
    { id: "group", method: "GET", path: "/api/groups/:groupId", state: "active" },
    { id: "groupMembers", method: "GET", path: "/api/groups/:groupId/members", state: "active" },
    { id: "createInvite", method: "POST", path: "/api/groups/:groupId/invite", state: "active" },
    { id: "joinGroup", method: "POST", path: "/api/groups/join/:token", state: "active" },
    { id: "balance", method: "GET", path: "/api/groups/:groupId/getbalance", state: "active" },
    { id: "createExpense", method: "POST", path: "/api/expenses/addexpense", state: "active" },
    { id: "listExpenses", method: "GET", path: "/api/expenses/:groupId", state: "active" },
    { id: "deleteExpense", method: "DELETE", path: "/api/expenses/:groupId/:expenseId", state: "active" },
    { id: "listRepayments", method: "GET", path: "/api/groups/:groupId/repayments", state: "active" },
    { id: "createRepayment", method: "POST", path: "/api/groups/:groupId/repayments", state: "active" },
    { id: "deleteRepayment", method: "DELETE", path: "/api/groups/:groupId/repayments/:repaymentId", state: "active" }
] as const satisfies readonly ApiEndpoint[]
