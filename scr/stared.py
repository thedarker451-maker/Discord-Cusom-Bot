#!/usr/bin/env python3
"""
Custom Discord Bot — Launcher con interfaz Rich.
Menú interactivo, telemetría en vivo, consola de logs y errores.
Controles: [←] volver · [↑↓] scroll · [q] menú · [t] detener · [l] logs · [e] errores
"""

from __future__ import annotations

import json
import os
import platform
import re
import shutil
import subprocess
import sys
import threading
import time
from collections import deque
from pathlib import Path
from queue import Empty, Queue
from typing import Callable, Optional

ROOT = Path(__file__).resolve().parent.parent
STATUS_FILE = ROOT / "secrets" / "bot-status.json"
BOT_NAME = "Custom Discord Bot"
LAUNCHER_VERSION = "3.5.0"
BUILD = 15.2

SECURITY_JSON_URL = (
    "https://raw.githubusercontent.com/thedarker451-maker/"
    "Discord-Cusom-Bot/refs/heads/main/vrs.security/safe.build.json"
)
SECURITY_CHECK_TIMEOUT = 5      # segundos para la petición HTTP
SECURITY_WARNING_SECONDS = 10   # segundos que dura el warning cancelable


def _parse_version(value: str) -> tuple[float, str]:
    """Separa un valor tipo '>15.2' o '15.2' en (numero, operador).
    operador es '>', '<', '>=', '<=' o '' (igualdad)."""
    value = value.strip()
    match = re.match(r"^(>=|<=|>|<)?\s*([0-9]+(?:\.[0-9]+)?)$", value)
    if not match:
        raise ValueError(f"Formato de versión no reconocido: {value!r}")
    op, num = match.groups()
    return float(num), (op or "")


def _version_matches(build: float, spec: str) -> bool:
    """Indica si 'build' cumple la condición dada en spec (ej '>15.2')."""
    num, op = _parse_version(spec)
    if op == ">":
        return build > num
    if op == "<":
        return build < num
    if op == ">=":
        return build >= num
    if op == "<=":
        return build <= num
    return build == num


def fetch_security_json(timeout: int = SECURITY_CHECK_TIMEOUT) -> Optional[dict]:
    """Descarga el JSON de seguridad remoto. Devuelve None si falla
    (sin internet, timeout, JSON inválido, etc.) en vez de reventar."""
    try:
        import urllib.request

        req = urllib.request.Request(
            SECURITY_JSON_URL,
            headers={"User-Agent": f"{BOT_NAME}/{LAUNCHER_VERSION}"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw)
    except Exception:
        return None


def cancellable_warning(message: str, seconds: int = SECURITY_WARNING_SECONDS) -> None:
    """Muestra un warning durante 'seconds' segundos, cancelable con Ctrl+D (EOF)
    o Ctrl+C. No bloquea el resto del programa más de lo necesario."""
    print(message)
    print(f"(Este aviso se cerrará solo en {seconds}s. Presiona Ctrl+D para continuar ahora.)")

    result: dict[str, bool] = {"done": False}

    def _wait_for_eof() -> None:
        try:
            sys.stdin.read()
        except Exception:
            pass
        result["done"] = True

    if sys.stdin.isatty() or sys.stdin.readable():
        t = threading.Thread(target=_wait_for_eof, daemon=True)
        t.start()
        start = time.time()
        try:
            while time.time() - start < seconds and not result["done"]:
                time.sleep(0.1)
        except KeyboardInterrupt:
            pass
    else:
        time.sleep(seconds)


def check_build_security() -> None:
    """Compara BUILD y LAUNCHER_VERSION contra el JSON remoto de seguridad.

    Reglas:
      - Si la build coincide con 'Unsafery Build' (bad build)  -> warning cancelable.
      - Si la build coincide con 'Safe Build'                  -> no avisa nada.
      - Si la 'Update' del JSON no coincide con LAUNCHER_VERSION -> warning cancelable.
      - Si no hay internet o el JSON es inválido -> se omite el chequeo silenciosamente.
    """
    data = fetch_security_json()
    if not data:
        return  # sin internet / error de red: no bloquear el arranque

    remote_update = str(data.get("Update", "")).strip()
    safe_build_spec = str(data.get("Safe Build", "")).strip()
    bad_build_spec = str(data.get("Unsafery Build", "")).strip()

    is_bad = False
    is_safe = False
    try:
        if bad_build_spec:
            is_bad = _version_matches(BUILD, bad_build_spec)
        if safe_build_spec:
            is_safe = _version_matches(BUILD, safe_build_spec)
    except ValueError:
        pass  # spec mal formado en el JSON remoto: ignorar comparación de build

    if is_bad:
        cancellable_warning(
            f"\n⚠ [SEGURIDAD] Tu build actual ({BUILD}) coincide con una build "
            f"marcada como INSEGURA ({bad_build_spec}).\n"
            f"Se recomienda actualizar a la build segura ({safe_build_spec or '—'})."
        )
    elif is_safe:
        pass  # build segura: no se avisa nada
    # si no coincide con ninguna de las dos, no se considera ni segura ni mala explícitamente

    def _normalize(v: str) -> tuple[int, ...]:
        parts = [p for p in re.split(r"[.\-]", v.strip()) if p != ""]
        nums = []
        for p in parts:
            try:
                nums.append(int(p))
            except ValueError:
                nums.append(0)
        return tuple(nums)

    norm_remote = _normalize(remote_update)
    norm_local = _normalize(LAUNCHER_VERSION)
    max_len = max(len(norm_remote), len(norm_local))
    norm_remote = norm_remote + (0,) * (max_len - len(norm_remote))
    norm_local = norm_local + (0,) * (max_len - len(norm_local))
    update_ok = (not remote_update) or (norm_remote == norm_local)
    if not update_ok:
        cancellable_warning(
            f"\n⚠ [ACTUALIZACIÓN] Tu versión local ({LAUNCHER_VERSION}) no está "
            f"sincronizada con la última versión publicada ({remote_update}).\n"
            f"Considera actualizar el launcher."
        )


check_build_security()

try:
    from rich import box
    from rich.align import Align
    from rich.console import Console, Group
    from rich.live import Live
    from rich.panel import Panel
    from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
    from rich.table import Table
    from rich.text import Text
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rich", "-q"])
    from rich import box
    from rich.align import Align
    from rich.console import Console, Group
    from rich.live import Live
    from rich.panel import Panel
    from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
    from rich.table import Table
    from rich.text import Text

console = Console()
key_queue: Queue[str] = Queue()
bot_process: Optional[subprocess.Popen] = None
last_size = (0, 0)
view_mode = "menu"
live_ref: Optional[Live] = None
nav_history: list[str] = []
log_scroll_offset: int = 0
error_scroll_offset: int = 0

log_lines: deque[str] = deque(maxlen=400)
error_lines: deque[str] = deque(maxlen=150)
ERROR_PATTERN = re.compile(r"(?i)(error|traceback|exception|\[!]|failed|fatal|uncaught|unhandled)")


def term_size() -> tuple[int, int]:
    return shutil.get_terminal_size(fallback=(80, 24))


def is_big_terminal() -> bool:
    cols, rows = term_size()
    return cols >= 100 and rows >= 28


def fmt_uptime(ms: int) -> str:
    s = max(0, ms // 1000)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}h {m}m {sec}s"


def read_status() -> dict:
    try:
        if STATUS_FILE.exists():
            return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        pass
    return {"online": False}


def is_error_line(line: str) -> bool:
    return bool(ERROR_PATTERN.search(line))


def run_cmd(cmd: list[str], cwd: Path = ROOT) -> int:
    return subprocess.run(cmd, cwd=cwd).returncode


def key_listener() -> None:
    if not sys.stdin.isatty():
        return
    try:
        import termios
        import tty

        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setcbreak(fd)
            while True:
                ch = sys.stdin.read(1)
                if ch == "":
                    break  # EOF: stdin cerrado, evitar loop infinito
                if ch == "\x1b":
                    seq1 = sys.stdin.read(1)
                    if seq1 == "[":
                        seq2 = sys.stdin.read(1)
                        arrow_map = {"A": "arrow_up", "B": "arrow_down", "C": "arrow_right", "D": "arrow_left"}
                        key_queue.put(arrow_map.get(seq2, f"esc[{seq2}"))
                    else:
                        key_queue.put("escape")
                else:
                    key_queue.put(ch.lower())
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)
    except Exception:
        pass


def drain_keys() -> list[str]:
    keys = []
    while True:
        try:
            keys.append(key_queue.get_nowait())
        except Empty:
            break
    return keys


def pause_live() -> None:
    global live_ref
    if live_ref and live_ref.is_started:
        live_ref.stop()


def resume_live() -> None:
    global live_ref
    if live_ref and not live_ref.is_started:
        live_ref.start()
        live_ref.update(get_render())


def splash_animation() -> None:
    frames = ["  ◐ Iniciando...", "  ◓ Iniciando...", "  ◑ Iniciando...", "  ◒ Iniciando..."]
    logo = Text.assemble(
        ("╔══════════════════════════════════════╗\n", "cyan"),
        ("║   ", "cyan"), (" ", "bold white"), (BOT_NAME, "bold magenta"),
        (f" v{LAUNCHER_VERSION}", "bold white"), ("         ║\n", "cyan"),
        ("╚══════════════════════════════════════╝", "cyan"),
    )
    with Progress(
        SpinnerColumn(), TextColumn("[bold cyan]{task.description}"),
        BarColumn(bar_width=30), TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console, transient=True,
    ) as progress:
        task = progress.add_task("Cargando interfaz", total=100)
        for i in range(100):
            progress.update(task, advance=1, description=frames[i % len(frames)])
            time.sleep(0.018)
    console.print(logo)
    console.print()


def task_animation(label: str, success: bool) -> None:
    color = "green" if success else "red"
    icon = "✓" if success else "✕"
    with console.status(f"[bold]{label}...", spinner="dots"):
        time.sleep(0.45)
    console.print(f"[{color}]{icon}[/{color}] {label}")


def farewell_panel() -> None:
    st = read_status()
    body = Text.assemble(
        ("Gracias por usar ", "dim"), (BOT_NAME, "bold magenta"), ("\n\n", ""),
        ("Estado final: ", "cyan"), ("Offline", "bold red"), ("\n", ""),
        ("Última sesión: ", "cyan"), (st.get("tag", "—"), "white"), ("\n", ""),
        ("Hasta pronto. ", "dim"), ("👋", ""),
    )
    console.print()
    console.print(Panel(Align.center(body), title="[bold cyan]Sesión finalizada[/]", border_style="cyan", box=box.DOUBLE))
    console.print()


def check_requirements() -> tuple[list[tuple[str, str, str]], bool]:
    rows: list[tuple[str, str, str]] = []
    ok = True

    node_ok = shutil.which("node") is not None
    node_ver = ""
    if node_ok:
        try:
            node_ver = subprocess.check_output(["node", "-v"], text=True).strip()
            major = int(node_ver.lstrip("v").split(".")[0])
            node_ok = major >= 18
        except (subprocess.CalledProcessError, ValueError):
            node_ok = False
    rows.append(("Node.js 18+", node_ver or "No instalado", "ok" if node_ok else "fail"))
    ok &= node_ok

    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
    py_ok = sys.version_info >= (3, 8)
    rows.append(("Python 3.8+", py_ver, "ok" if py_ok else "fail"))
    ok &= py_ok

    ram_gb = 4.0
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    ram_gb = int(line.split()[1]) / 1024 / 1024
                    break
    except OSError:
        pass
    ram_ok = ram_gb >= 1.0
    rows.append(("RAM ≥ 1 GB", f"{ram_gb:.1f} GB", "ok" if ram_ok else "warn"))
    ok &= ram_ok

    disk_gb = shutil.disk_usage(ROOT).free / (1024 ** 3)
    rows.append(("Disco libre ≥ 0.5 GB", f"{disk_gb:.1f} GB", "ok" if disk_gb >= 0.5 else "warn"))
    rows.append(("secrets/.env", "Presente" if (ROOT / "secrets" / ".env").exists() else "Falta",
                   "ok" if (ROOT / "secrets" / ".env").exists() else "warn"))
    rows.append(("Sistema", f"{platform.system()} {platform.release()}", "ok"))
    rows.append(("Arquitectura", platform.machine(), "ok"))
    return rows, ok


def build_requirements_table(rows: list[tuple[str, str, str]], compact: bool) -> Table:
    table = Table(box=box.ROUNDED, expand=not compact, show_header=True, header_style="bold cyan")
    table.add_column("Requisito", style="white")
    table.add_column("Estado", style="dim")
    table.add_column("OK", justify="center", width=4)
    show = rows if not compact else rows[:4]
    for req, val, status in show:
        mark = {"ok": "[green]✓[/]", "fail": "[red]✕[/]", "warn": "[yellow]![/]"}.get(status, "?")
        table.add_row(req, val, mark)
    if compact and len(rows) > 4:
        table.add_row("…", f"+{len(rows) - 4} más (amplía la terminal)", "")
    return table


def build_console_panel(title: str, lines: deque[str], empty_msg: str, border: str, scroll_offset: int = 0) -> Panel:
    if lines:
        total = len(lines)
        visible = 18
        max_offset = max(0, total - visible)
        offset = max(0, min(scroll_offset, max_offset))
        start = max(0, total - visible - offset)
        end = total - offset
        tail = list(lines)[start:end]
        scroll_info = ""
        if total > visible:
            scroll_info = f"  [dim]({offset + 1}-{min(offset + visible, total)}/{total})[/]"
        content = "\n".join(f"[dim]{line}[/]" if not is_error_line(line) else f"[red]{line}[/]" for line in tail)
        if offset > 0:
            content = f"[dim italic]↑ Más arriba...[/]\n{content}"
        if offset < max_offset:
            content = f"{content}\n[dim italic]↓ Más abajo...[/]"
        title = f"{title}{scroll_info}"
    else:
        content = f"[dim italic]{empty_msg}[/]"
    return Panel(content, title=title, border_style=border)


def build_menu_render(compact: bool) -> Group:
    req_rows, all_ok = check_requirements()
    st = read_status()
    lb_url = st.get("leaderboardUrl", "")
    nav_indicator = ""
    if nav_history:
        nav_indicator = f"  [dim]← [{nav_history[-1]}] puedes volver[/]\n"
    menu_text = Text.assemble(
        ("\n", ""),
        (nav_indicator, ""),
        ("  ", ""), ("[1]", "bold yellow"), (" Iniciar el bot  ", ""), ("(default · 5s)\n", "dim"),
        ("  ", ""), ("[2]", "bold yellow"), (" Restablecer clave de encriptación\n", ""),
        ("  ", ""), ("[3]", "bold yellow"), (" Solo encriptar variables del .env\n", ""),
        ("  ", ""), ("[p]", "bold magenta"), (" Perfil / telemetría\n", "dim"),
        ("  ", ""), ("[l]", "bold green"), (" Consola de logs  ", "dim"), ("[e]", "bold red"), (" Errores\n", "dim"),
    )
    if lb_url:
        menu_text.append(f"\n  🏆 Leaderboard: [link={lb_url}]{lb_url}[/link]\n", style="cyan")
    if not all_ok:
        menu_text.append("\n  [!] Algunos requisitos no se cumplen.\n", style="bold red")
    parts = [
        Panel(Align.center(Text.assemble((BOT_NAME, "bold magenta"), (f"\nv{LAUNCHER_VERSION}", " dim"))), border_style="cyan", box=box.DOUBLE),
        Panel(menu_text, title="Menú principal", border_style="blue"),
        Panel(build_requirements_table(req_rows, compact), title="Requisitos del sistema", border_style="green"),
    ]
    if not compact:
        parts.append(Panel(
            "[dim][bold]q[/] menú · [bold]t[/] detener · [bold]l[/] logs · [bold]e[/] errores · "
            "[bold]Ctrl+C[/] salir[/]",
            border_style="dim",
        ))
    return Group(*parts)


def build_profile_render(compact: bool) -> Group:
    st = read_status()
    online = st.get("online", False)
    cols, rows = term_size()
    nav_info = ""
    if nav_history:
        nav_info = f"  [dim]← [{nav_history[-1]}] [/]"
    info = Table.grid(padding=(0, 2))
    info.add_column(style="cyan", justify="right")
    info.add_column(style="white")
    info.add_row("Estado", "[green]Online[/]" if online else "[red]Offline / Conectando[/]")
    info.add_row("Bot", st.get("tag", "—"))
    info.add_row("Ping", f"{st.get('ping', 0)} ms")
    info.add_row("Servidores", str(st.get("guilds", 0)))
    info.add_row("Usuarios", str(st.get("users", 0)))
    info.add_row("Uptime", fmt_uptime(st.get("uptime", 0)))
    if st.get("leaderboardUrl"):
        info.add_row("Leaderboard", f"[link={st['leaderboardUrl']}]{st['leaderboardUrl']}[/link]")
    if st.get("dashboardUrl"):
        info.add_row("Dashboard", f"[link={st['dashboardUrl']}]{st['dashboardUrl']}[/link]")
    if not compact:
        info.add_row("SO", st.get("os", platform.system()))
        info.add_row("Node", st.get("node", "—"))
        info.add_row("RAM bot", f"{st.get('memoryMb', 0)} MB")
        info.add_row("Terminal", f"{cols}×{rows} {'[Big]' if is_big_terminal() else '[Compact]'}")
    controls = Text.assemble(
        ("[←]", "bold yellow"), (" Volver  ", "dim"),
        ("[q]", "bold yellow"), (" Menú  ", "dim"),
        ("[t]", "bold red"), (" Detener  ", "dim"),
        ("[l]", "bold green"), (" Logs  ", "dim"),
        ("[e]", "bold red"), (" Errores", "dim"),
    )
    parts = [
        Panel(Align.center(Text.assemble(("📡 Perfil en vivo", "bold magenta"), (nav_info, ""))), border_style="magenta"),
        Panel(info, title="Telemetría", border_style="cyan"),
        Panel(controls, title="Controles", border_style="yellow"),
    ]
    return Group(*parts)


def build_logs_render() -> Group:
    running = bot_process is not None and bot_process.poll() is None
    status = "[green]Bot activo[/]" if running else "[red]Bot detenido[/]"
    nav_info = ""
    if nav_history:
        nav_info = f"  [dim]← [{nav_history[-1]}] [/]"
    header = Panel(
        Text.assemble(("📋 Consola en tiempo real  ", "bold green"), ("· ", "dim"), (status, ""), (nav_info, "")),
        border_style="green",
    )
    console_panel = build_console_panel(
        f"Logs ({len(log_lines)})",
        log_lines,
        "Esperando salida del bot… Inicia con [1] o espera el auto-start.",
        "green",
        log_scroll_offset,
    )
    controls = Panel(
        Text.assemble(
            ("[←]", "bold yellow"), (" Volver  ", "dim"),
            ("[↑↓]", "bold cyan"), (" Scroll  ", "dim"),
            ("[q]", "bold yellow"), (" Menú  ", "dim"),
            ("[l]", "bold green"), (" Logs  ", "dim"),
            ("[e]", "bold red"), (" Errores", "dim"),
        ),
        title="Controles",
        border_style="yellow",
    )
    return Group(header, console_panel, controls)


def build_errors_render() -> Group:
    nav_info = ""
    if nav_history:
        nav_info = f"  [dim]← [{nav_history[-1]}] [/]"
    header = Panel(
        Text.assemble(("🚨 Errores del bot  ", "bold red"), ("· ", "dim"), (f"{len(error_lines)} registrados", "yellow"), (nav_info, "")),
        border_style="red",
    )
    console_panel = build_console_panel(
        f"Errores ({len(error_lines)})",
        error_lines,
        "Sin errores por ahora. Los mensajes con [!], Error o Traceback aparecen aquí.",
        "red",
        error_scroll_offset,
    )
    controls = Panel(
        Text.assemble(
            ("[←]", "bold yellow"), (" Volver  ", "dim"),
            ("[↑↓]", "bold cyan"), (" Scroll  ", "dim"),
            ("[q]", "bold yellow"), (" Menú  ", "dim"),
            ("[l]", "bold green"), (" Logs  ", "dim"),
            ("[e]", "bold red"), (" Errores", "dim"),
        ),
        title="Controles",
        border_style="yellow",
    )
    return Group(header, console_panel, controls)


def get_render() -> Group:
    if view_mode == "profile":
        return build_profile_render(not is_big_terminal())
    if view_mode == "logs":
        return build_logs_render()
    if view_mode == "errors":
        return build_errors_render()
    return build_menu_render(not is_big_terminal())


def ensure_dependencies() -> bool:
    if not (ROOT / "node_modules").exists():
        task_animation("Instalando dependencias npm", True)
        return run_cmd(["npm", "install"]) == 0
    return True


def encrypt_env() -> None:
    task_animation("Encriptando variables del .env", True)
    run_cmd(["node", "scr/security-helper.js", "--encrypt"])


def reset_key() -> None:
    console.print(Panel("[bold red]⚠ Esto eliminará secrets/.key y desencriptará el .env[/]", border_style="red"))
    confirm = console.input("[yellow]¿Confirmar? (s/N): [/]").strip().lower()
    if confirm == "s":
        task_animation("Restablecimiento de clave", run_cmd(["node", "scr/security-helper.js", "--reset"]) == 0)
    else:
        console.print("[blue]Operación cancelada.[/]")


def free_dashboard_port() -> None:
    port = os.environ.get("PORT", "3000")
    try:
        out = subprocess.check_output(["lsof", "-ti", f"tcp:{port}"], text=True, stderr=subprocess.DEVNULL).strip()
        if out:
            for pid in out.split():
                subprocess.run(["kill", "-9", pid], stderr=subprocess.DEVNULL)
            task_animation(f"Puerto {port} liberado", True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass


def _pipe_bot_output() -> None:
    if not bot_process or not bot_process.stdout:
        return
    for raw in bot_process.stdout:
        line = raw.rstrip("\n\r")
        if not line:
            continue
        log_lines.append(line)
        if is_error_line(line):
            error_lines.append(line)


def start_bot_process() -> bool:
    global bot_process
    if bot_process and bot_process.poll() is None:
        return True
    env_file = ROOT / "secrets" / ".env"
    if not env_file.exists():
        example = ROOT / "secrets" / ".env.example"
        if example.exists():
            shutil.copy(example, env_file)
    if not ensure_dependencies():
        task_animation("Error al instalar dependencias", False)
        return False
    encrypt_env()
    free_dashboard_port()
    log_lines.clear()
    error_lines.clear()
    bot_process = subprocess.Popen(
        ["npm", "start"], cwd=ROOT,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
    )
    threading.Thread(target=_pipe_bot_output, daemon=True).start()
    task_animation("Bot iniciado", True)
    return True


def stop_bot(animate: bool = True) -> None:
    global bot_process
    if bot_process and bot_process.poll() is None:
        bot_process.terminate()
        try:
            bot_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            bot_process.kill()
        if animate:
            task_animation("Bot detenido", True)
        else:
            console.print("[green]✓[/] Bot detenido")
    bot_process = None
    try:
        STATUS_FILE.write_text(json.dumps({"online": False}, indent=2))
    except OSError:
        pass


def handle_menu_choice(choice: str) -> None:
    global view_mode
    if choice in ("1", ""):
        if start_bot_process():
            navigate_to("profile")
    elif choice == "2":
        stop_bot()
        reset_key()
    elif choice == "3":
        encrypt_env()
    elif choice == "p":
        if bot_process and bot_process.poll() is None:
            navigate_to("profile")
        else:
            console.print("[yellow]El bot no está en ejecución.[/]")
            time.sleep(1.2)
    elif choice == "l":
        navigate_to("logs")
    elif choice == "e":
        navigate_to("errors")


def handle_profile_key(key: str) -> Optional[str]:
    global view_mode
    if key == "q":
        navigate_back()
        return "menu"
    if key == "arrow_left":
        navigate_back()
        return "menu"
    if key == "t":
        return "stop"
    if key == "l":
        navigate_to("logs")
    elif key == "e":
        navigate_to("errors")
    return None


def navigate_to(new_view: str) -> None:
    global view_mode, nav_history, log_scroll_offset, error_scroll_offset
    if new_view == view_mode:
        return
    nav_history.append(view_mode)
    if len(nav_history) > 20:
        nav_history.pop(0)
    view_mode = new_view
    log_scroll_offset = 0
    error_scroll_offset = 0


def navigate_back() -> None:
    global view_mode, nav_history, log_scroll_offset, error_scroll_offset
    if nav_history:
        view_mode = nav_history.pop()
    else:
        view_mode = "menu"
    log_scroll_offset = 0
    error_scroll_offset = 0


def run_with_live(action: Callable[[], None]) -> None:
    pause_live()
    try:
        action()
    finally:
        resume_live()


def main() -> None:
    global view_mode, last_size, live_ref, log_scroll_offset, error_scroll_offset
    if sys.stdin.isatty():
        threading.Thread(target=key_listener, daemon=True).start()
    splash_animation()
    last_size = term_size()
    menu_deadline = time.time() + 5.0
    pending_choice: Optional[str] = None

    with Live(get_render(), console=console, refresh_per_second=4, screen=True) as live:
        live_ref = live
        while True:
            if term_size() != last_size:
                last_size = term_size()
                live.update(get_render())

            for key in drain_keys():
                if view_mode == "profile":
                    action = handle_profile_key(key)
                    if action == "menu":
                        menu_deadline = time.time() + 999999
                    elif action == "stop":
                        pause_live()
                        stop_bot(animate=True)
                        navigate_to("menu")
                        menu_deadline = time.time() + 5.0
                        resume_live()
                elif view_mode in ("logs", "errors"):
                    if key == "q":
                        navigate_back()
                    elif key == "arrow_left":
                        navigate_back()
                    elif key == "arrow_up":
                        if view_mode == "logs":
                            log_scroll_offset = min(log_scroll_offset + 3, max(0, len(log_lines) - 18))
                        else:
                            error_scroll_offset = min(error_scroll_offset + 3, max(0, len(error_lines) - 18))
                    elif key == "arrow_down":
                        if view_mode == "logs":
                            log_scroll_offset = max(0, log_scroll_offset - 3)
                        else:
                            error_scroll_offset = max(0, error_scroll_offset - 3)
                    elif key == "p" and bot_process and bot_process.poll() is None:
                        navigate_to("profile")
                    elif key == "l":
                        navigate_to("logs")
                    elif key == "e":
                        navigate_to("errors")
                    elif key == "t" and bot_process and bot_process.poll() is None:
                        pause_live()
                        stop_bot(animate=True)
                        navigate_to("menu")
                        menu_deadline = time.time() + 5.0
                        resume_live()
                elif view_mode == "menu" and key in "123ple":
                    pending_choice = key
                    menu_deadline = 0
                elif view_mode == "menu" and key == "arrow_left":
                    if nav_history:
                        navigate_back()

            live.update(get_render())

            if view_mode == "menu" and pending_choice is not None:
                choice = pending_choice
                pending_choice = None
                pause_live()
                handle_menu_choice(choice)
                if choice in ("2", "3") and view_mode == "menu":
                    return
                menu_deadline = time.time() + (999999 if view_mode != "menu" else 5.0)
                resume_live()

            if view_mode == "menu" and time.time() >= menu_deadline:
                pause_live()
                handle_menu_choice("1")
                navigate_to("profile")
                resume_live()
                menu_deadline = time.time() + 999999

            time.sleep(0.2 if view_mode == "profile" else 0.12)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pause_live()
        stop_bot(animate=False)
        farewell_panel()
