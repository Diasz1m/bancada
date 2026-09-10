export interface Article {
  id: string
  title: string
  keywords: string[]
  steps: string[]
  extra: string[]
}

export const ARTICLES: Article[] = [
  {
    id: 'vpn',
    title: 'VPN que cai ou não conecta',
    keywords: [
      'vpn',
      'firewall',
      'tunel',
      'túnel',
      'home office',
      'desconecta',
      'cai',
      'anyconnect',
      'forticlient',
      'rede corporativa',
    ],
    steps: [
      'Feche o cliente VPN por completo (não só minimizar) e abra de novo.',
      'Escolha o perfil “Bancada 2026”. O perfil antigo quebrou depois da troca do firewall.',
      'Se pedir certificado, aceite o da TI. Recusar a troca costuma derrubar o túnel a cada poucos minutos.',
      'Teste um site interno (intranet) e um externo. Se só o interno falhar, ainda é VPN.',
    ],
    extra: [
      'Desative Wi-Fi temporário / “segurança de rede” do antivírus só para testar.',
      'Troque de rede (do Wi-Fi de casa para o 4G do celular). Se estabilizar, o provedor está filtrando UDP.',
      'Reinstale o cliente VPN a partir do portal interno; não use o instalador antigo.',
    ],
  },
  {
    id: 'monitor',
    title: 'Segundo monitor / dock HDMI',
    keywords: [
      'monitor',
      'hdmi',
      'displayport',
      'dock',
      'docket',
      'tela',
      'segundo',
      'projetor',
      'usb-c',
      'usbc',
    ],
    steps: [
      'Desconecte a dock da tomada e do notebook, espere 20 segundos, reconecte alimentação primeiro e só depois o USB-C.',
      'No Windows: clique com o botão direito na área de trabalho → Configurações de vídeo → Detectar.',
      'Troque o cabo HDMI (ou use a porta DisplayPort da dock, se houver). Cabo solto é a causa mais comum.',
      'Em “Configurações de vídeo”, confirme que a tela extra não está em “Desconectar este vídeo”.',
    ],
    extra: [
      'Atualize o driver da dock no site da Dell/Lenovo — o Windows Update costuma atrasar isso.',
      'Teste o monitor direto no HDMI do notebook, sem a dock, para isolar o acessório.',
      'Se for dongle USB-C genérico, troque por um certificado; vários param depois de sleep.',
    ],
  },
  {
    id: 'drive',
    title: 'Acesso a pasta ou drive de projetos',
    keywords: [
      'drive',
      'pasta',
      'projetos',
      'compartilha',
      'permissao',
      'permissão',
      'smb',
      'rede',
      '\\\\',
      'acesso negado',
      'acme',
    ],
    steps: [
      'Confirme se você está na VPN. Sem túnel, o drive \\bancada\\projetos nem aparece.',
      'No Explorer, acesse \\\\bancada\\projetos — não use o atalho antigo da área de trabalho.',
      'Se der “acesso negado”, peça para o gestor do time confirmar o grupo AD (ex.: projetos-2026).',
      'Saia e entre de novo no Windows (logoff) depois que o grupo for liberado; a permissão não pega na hora.',
    ],
    extra: [
      'Mapeie de novo: Explorer → Este Computador → Mapear unidade de rede → \\\\bancada\\projetos.',
      'Se o caminho mudou no ano, use /projetos/2026 e não a pasta do ano anterior.',
    ],
  },
  {
    id: 'senha',
    title: 'Senha, bloqueio ou MFA',
    keywords: ['senha', 'password', 'bloqueio', 'bloqueada', 'mfa', '2fa', 'token', 'login', 'ad', 'conta'],
    steps: [
      'Aguarde 15 minutos se a conta travou por tentativas. O desbloqueio automático roda nesse intervalo.',
      'Redefina em https://senha.bancada.test com o e-mail corporativo. Use uma senha nova; a política rejeita as últimas 5.',
      'No MFA, aprove o push no telefone. Se o aparelho trocou, diga aqui que precisa re-enrolar o token.',
      'Não use a senha de e-mail pessoal. A conta da Bancada é outra.',
    ],
    extra: [
      'Se o MFA está no celular antigo, um agente precisa resetar o token — isso eu não faço sozinha.',
      'Caps Lock e teclado numérico derrubam muita gente no login da VPN.',
    ],
  },
  {
    id: 'impressora',
    title: 'Impressora da sala ou do andar',
    keywords: ['impressora', 'imprimir', 'print', 'toner', 'papel', 'fila', 'spooler'],
    steps: [
      'Veja se a impressora não está em erro de papel/toner no painel.',
      'No Windows: Configurações → Bluetooth e dispositivos → Impressoras → abrir a fila e limpar documentos travados.',
      'Remova a impressora e adicione de novo pelo nome BANCADA-ANDAR-XX no catálogo.',
      'Reinicie o spooler: serviços do Windows → Spooler de Impressão → Reiniciar.',
    ],
    extra: [
      'Impressão em PDF/XPS às vezes indica driver quebrado; reinstale pelo portal de TI.',
      'Se só a sua máquina falha e as outras imprimem, o problema não é o equipamento do andar.',
    ],
  },
  {
    id: 'email',
    title: 'Outlook / e-mail corporativo',
    keywords: ['email', 'e-mail', 'outlook', 'caixa', 'smtp', 'ost', 'assinatura', 'calendario', 'calendário'],
    steps: [
      'Feche o Outlook, abra de novo e espere a barra inferior sair de “Desconectado”.',
      'Arquivo → Configurações da conta → Reparar perfil.',
      'Se a caixa não atualiza, trabalhe um pouco pelo webmail (mail.bancada.test) para confirmar se é só o cliente.',
      'Anexos grandes (>25 MB) não saem; use o drive e envie o link.',
    ],
    extra: [
      'Perfil OST corrompido: criar um perfil novo no Painel de Controle → Mail costuma resolver.',
      'Regra de inbox demais pode “sumir” com mensagem; verifique a pasta Itens automáticos.',
    ],
  },
  {
    id: 'wifi',
    title: 'Wi-Fi do escritório',
    keywords: ['wifi', 'wi-fi', 'wireless', 'ssid', 'sinal', 'rede sem fio', 'internet cai'],
    steps: [
      'Esqueça a rede BANCADA-CORP e conecte de novo com a senha do crachá (não a de convidados).',
      'Prefira a faixa 5 GHz. A 2.4 GHz no andar comercial fica saturada.',
      'Reinicie o adaptador: modo avião 10 segundos, depois desligue.',
      'Se for notebook novo, instale o driver Wi-Fi do fabricante; o genérico da Microsoft falha com o controlador da empresa.',
    ],
    extra: [
      'No home office isso não se aplica — aí o caminho é a VPN, não o SSID interno.',
      'Certificado Wi-Fi expira todo ano em março; se cair só no escritório, avise.',
    ],
  },
  {
    id: 'lento',
    title: 'Computador lento',
    keywords: ['lento', 'travando', 'travou', 'demora', 'cpu', 'memoria', 'memória', 'disco', 'desempenho'],
    steps: [
      'Reinicie o notebook. Updates do Windows acumulados deixam o disco em 100% até o reboot.',
      'Abra o Gerenciador de tarefas e veja se Teams, Chrome ou um backup está em CPU/Disco altos.',
      'Libere pelo menos 15% de disco em C:. Abaixo disso o Windows começa a engasgar.',
      'Feche o OneDrive na bandeja se ele estiver “sincronizando 10 mil arquivos”.',
    ],
    extra: [
      'Máquina com HDD (não SSD) e 8 GB de RAM não aguenta o pacote atual — aí precisa de troca, e eu escalo.',
      'Após as 18h o antivírus roda scan pesado; se só trava à noite, é isso.',
    ],
  },
  {
    id: 'software',
    title: 'Instalar ou liberar software',
    keywords: ['instalar', 'software', 'licenca', 'licença', 'aplicativo', 'programa', 'office', 'adobe', 'vpn client'],
    steps: [
      'Abra o Company Portal / portal de software. O que está lá instala sem chamado.',
      'Não baixe instalador da internet; o antivírus bloqueia e a TI precisa limpar depois.',
      'Se o app pedir admin, cancele e registre o nome exato da ferramenta aqui.',
      'Licenças pagas (Adobe, Visio) passam por aprovação do gestor — eu já deixo isso preparado se for o caso.',
    ],
    extra: [
      'Versão errada de Office (32 vs 64 bits) quebra add-in; desinstale pelo portal e reinstale a 64 bits.',
    ],
  },
]
