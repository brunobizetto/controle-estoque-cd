# bichinhos

Mod do Claude Code: uma barra acima do prompt onde um bonequinho em pixel art
anda pela caverna e, de vez em quando, dá um dash para frente. À direita, uma
janela mostra um clipe da caverna, espelhado.

- **App desktop e celular:** a barra é um SVG animado (SMIL), tocado pelo próprio
  app, sem timers nem redesenhos.
- **Terminal:** uma versão em texto, com o relógio de quadros do próprio terminal.
- **Ferramenta `status`:** diz quais telas estão conectadas à sessão e quando a
  barra foi pedida, para descobrir por que ela não aparece.

## Antes de instalar: gerar as imagens

As duas animações não estão no repositório (ele é público). Gere
`hooks/assets.ts` a partir delas, com o Pillow instalado:

```
python3 tools/make_assets.py caminho/do/boneco.webp caminho/da/caverna.webp
```

## Instalar

Com a pasta gerada, numa sessão do Claude Code no terminal:

```
claude --plugin-dir caminho/para/bichinhos
```

Depois que esta pasta estiver na branch principal (`main`) do repositório, o
mod também instala pelo marketplace (precisa do `hooks/assets.ts` gerado, então
o caminho acima é o mais direto):

```
/plugin install bichinhos --marketplace brunobizetto/controle-estoque-cd
```

A barra recolhe com o `[-]` ao lado dela ou com ctrl+x ctrl+a.

## Testes

```
claude plugin validate bichinhos
claude plugin test bichinhos
```
