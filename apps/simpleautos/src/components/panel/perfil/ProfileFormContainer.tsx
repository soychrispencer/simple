import React, { useState } from "react";
import { PersonalDataForm } from "@simple/profile";
import { Button } from "@simple/ui";
import PublicPageForm from "./PublicPageForm";

const ProfileFormContainer: React.FC<{ user: any }> = ({ user }) => {
  const [tab, setTab] = useState<'perfil' | 'pagina'>('perfil');

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <Button size="sm" shape="rounded" variant={tab==='perfil'?'primary':'neutral'} onClick={() => setTab('perfil')}>Datos personales</Button>
        <Button size="sm" shape="rounded" variant={tab==='pagina'?'primary':'neutral'} onClick={() => setTab('pagina')}>Mi página</Button>
      </div>
      {tab === 'perfil' && <PersonalDataForm user={user} />}
      {tab === 'pagina' && <PublicPageForm user={user} />}
    </div>
  );
};

export default ProfileFormContainer;







