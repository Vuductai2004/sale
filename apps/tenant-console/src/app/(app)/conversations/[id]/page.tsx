import { RequirePermission } from '../../../../components/auth/RequirePermission';
import { ConversationWorkspace } from '../../../../components/conversation/ConversationWorkspace';

export const metadata = {
  title: 'Chi tiết hội thoại | AgentOS',
  description: 'Chi tiết hội thoại và quyền tiếp quản.',
};

export default async function ConversationDetailPage({ params }: { readonly params: { readonly id: string } }) {
  return (
    <RequirePermission permission="conversation:takeover">
      <ConversationWorkspace initialConversationId={params.id} />
    </RequirePermission>
  );
}
