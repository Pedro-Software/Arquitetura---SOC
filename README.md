# CyberPose // SOC Architecture

Projeto web inspirado no AstroPose original, mas trocando o globo por uma arquitetura 3D holográfica de cibersegurança.

## O que foi mantido
- Controle por gestos com MediaPipe Hands
- Uso de câmera do celular ou computador
- Interface sci-fi com painel lateral e chat
- Rotação e zoom por gestos

## O que foi alterado
- Globo da Terra substituído por uma topologia 3D de arquitetura SOC
- Cena em fundo escuro com linhas de neon e iluminação cinematográfica
- Fluxo principal: Kali Linux atacante -> Suricata -> SIEM -> MISP
- Painel de escaneamento agora mostra detalhes dos componentes da arquitetura

## Gestos
- Punho fechado: rotaciona a cena
- Palma aberta: entra em modo de escaneamento
- Sinal de paz: zoom in
- Um dedo: zoom out

## Como rodar
Como o projeto usa módulos ES e câmera, rode com um servidor local.

Exemplos:
- Python: `python -m http.server 8000`
- VS Code + Live Server

Depois abra `http://localhost:8000`

## Chat IA
O chat já funciona com respostas locais.
Se quiser usar Gemini, substitua `SUA_CHAVE_AQUI` no `script.js`.
