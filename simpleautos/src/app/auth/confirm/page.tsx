



import ConfirmClient from './ConfirmClient';

export default function Page(props: any) {
  const searchParams = props?.searchParams;
  const email = typeof searchParams?.email === 'string'
    ? searchParams.email
    : (Array.isArray(searchParams?.email) ? searchParams.email[0] : '') || '';
  const hasAccessToken = !!searchParams?.access_token;
  const confirmedFlag = searchParams?.confirmed === '1' || hasAccessToken;

  return <ConfirmClient emailFromQuery={email} confirmedFlag={confirmedFlag} />;
}
