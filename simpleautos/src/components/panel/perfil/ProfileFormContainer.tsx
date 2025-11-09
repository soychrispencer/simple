import React, { useState } from "react";
import PersonalDataForm from "./PersonalDataForm";
import { Button } from "@/components/ui/Button";
import CompanyDataForm from "./CompanyDataForm";
import PublicPageForm from "./PublicPageForm";

const ProfileFormContainer: React.FC<{ user: any; empresa?: any }> = ({ user, empresa }) => {
  const [tab, setTab] = useState<'perfil' | 'empresa' | 'pagina'>('perfil');

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <Button size="sm" shape="rounded" variant={tab==='perfil'?'primary':'neutral'} onClick={() => setTab('perfil')}>Datos personales</Button>
        <Button size="sm" shape="rounded" variant={tab==='empresa'?'primary':'neutral'} onClick={() => setTab('empresa')}>Mi empresa</Button>
        <Button size="sm" shape="rounded" variant={tab==='pagina'?'primary':'neutral'} onClick={() => setTab('pagina')}>Mi página</Button>
      </div>
      {tab === 'perfil' && <PersonalDataForm user={user} />}
      {tab === 'empresa' && <CompanyDataForm empresa={empresa} />}
      {tab === 'pagina' && <PublicPageForm user={user} />}
    </div>
  );
};

export default ProfileFormContainer;
