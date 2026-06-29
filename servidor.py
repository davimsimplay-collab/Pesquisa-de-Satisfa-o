#!/usr/bin/env python3
"""
Servidor local da Pesquisa de Satisfacao.

Igual ao 'python -m http.server', mas envia Cache-Control: no-cache para que o
navegador SEMPRE revalide os arquivos. Assim, ao atualizar qualquer arquivo do
app, a nova versao e carregada na hora (sem cache velho atrapalhando).

Uso:  python servidor.py        (porta 8080)
      python servidor.py 9000   (outra porta)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # forca revalidacao a cada carregamento
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silencioso


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Pesquisa de Satisfacao rodando em http://localhost:{port}/")
    print("  Pesquisa (login):  http://localhost:%d/login.html" % port)
    print("  Cadastro (admin):  http://localhost:%d/cadastro.html" % port)
    print("  Painel central:    http://localhost:%d/painel-central.html" % port)
    print("\nPressione CTRL+C para encerrar.")
    try:
        ThreadingHTTPServer(("", port), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")
