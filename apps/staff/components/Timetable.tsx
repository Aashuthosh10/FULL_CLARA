import React, { useState, useEffect } from 'react';
import { TimetableEntry, DayOfWeek, ActivityType } from '../types';
import { ACTIVITY_COLORS } from '../constants';

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
    "08:30-09:30", "09:30-10:30", "10:30-11:30", "11:30-12:30", 
    "12:30-13:30", "13:30-14:30", "14:30-15:30", "15:30-16:30"
];
const ACTIVITY_TYPES: ActivityType[] = [
    "Teaching", "Office Hours", "Meeting", "Lab Session", 
    "Consultation", "Free", "Busy", "Team Standup", "Client Review", 
    "Sprint Planning", "Team Lunch"
];

const Toast: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed bottom-5 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
        <i className="fa-solid fa-check-circle mr-2"></i>
        {message}
    </div>
);

interface TimetableProps {
    initialTimetable: TimetableEntry[];
    onTimetableUpdate: (newTimetable: TimetableEntry[]) => void;
}

const Timetable: React.FC<TimetableProps> = ({ initialTimetable, onTimetableUpdate }) => {
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        setTimetable(initialTimetable);
    }, [initialTimetable]);

    const handleSave = () => {
        onTimetableUpdate(timetable);
        setIsEditing(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleEntryChange = (id: string, field: keyof TimetableEntry, value: any) => {
        setTimetable(currentTimetable => 
            currentTimetable.map(entry => 
                entry.id === id ? { ...entry, [field]: value } : entry
            )
        );
    };

    const handleAddEntry = (day: DayOfWeek, timeSlot: string) => {
        const [start, end] = timeSlot.split('-');
        const newEntry: TimetableEntry = {
            id: `${day}-${timeSlot}-${Date.now()}`,
            day,
            timeSlot: { start, end },
            activity: 'Free',
            subject: '',
            room: ''
        };
        setTimetable([...timetable, newEntry]);
    };

    const handleDeleteEntry = (id: string) => {
        setTimetable(timetable.filter(entry => entry.id !== id));
    };

    return (
        <div className="p-4 md:p-6 bg-slate-900/50 backdrop-blur-lg rounded-2xl border border-white/10 text-white h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">My Weekly Timetable</h2>
                <div className="flex space-x-3">
                    {!isEditing ? (
                        <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2">
                            <i className="fa-solid fa-pencil"></i>
                            <span>Edit</span>
                        </button>
                    ) : (
                        <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2">
                            <i className="fa-solid fa-save"></i>
                            <span>Save</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-auto">
                <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold">
                    <div className="sticky top-0 bg-slate-900/70 p-2 z-10">Time</div>
                    {DAYS.map(day => <div key={day} className="sticky top-0 bg-slate-900/70 p-2 z-10">{day}</div>)}

                    {TIME_SLOTS.map(time => (
                        <React.Fragment key={time}>
                            <div className="p-2 self-center">{time}</div>
                            {DAYS.map(day => {
                                const entry = timetable.find(e => e.day === day && `${e.timeSlot.start}-${e.timeSlot.end}` === time);
                                return (
                                    <div key={`${day}-${time}`} className={`min-h-[100px] rounded-md p-1.5 flex flex-col justify-center items-center ${isEditing ? 'bg-slate-800/50' : 'bg-slate-900/30'}`}>
                                        {isEditing ? (
                                            entry ? (
                                                <div className="w-full space-y-1">
                                                     <select
                                                        value={entry.activity}
                                                        onChange={(e) => handleEntryChange(entry.id, 'activity', e.target.value as ActivityType)}
                                                        className="w-full bg-slate-700 text-xs rounded border-slate-600 text-white"
                                                    >
                                                        {ACTIVITY_TYPES.map(at => <option key={at} value={at}>{at}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Subject"
                                                        value={entry.subject || ''}
                                                        onChange={(e) => handleEntryChange(entry.id, 'subject', e.target.value)}
                                                        className="w-full bg-slate-700 text-xs rounded border-slate-600"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Room"
                                                        value={entry.room || ''}
                                                        onChange={(e) => handleEntryChange(entry.id, 'room', e.target.value)}
                                                        className="w-full bg-slate-700 text-xs rounded border-slate-600"
                                                    />
                                                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-500 hover:text-red-400 text-xs pt-1">
                                                        <i className="fa-solid fa-trash-alt"></i> Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleAddEntry(day, time)} className="text-slate-400 hover:text-white">
                                                    <i className="fa-solid fa-plus"></i>
                                                </button>
                                            )
                                        ) : (
                                            entry && entry.activity !== 'Free' ? (
                                                <div className={`w-full h-full flex flex-col justify-center text-xs font-semibold rounded-md p-2 ${ACTIVITY_COLORS[entry.activity]}`}>
                                                    <p>{entry.activity}</p>
                                                    {entry.subject && <p className="opacity-80 font-normal truncate">{entry.subject}</p>}
                                                    {entry.room && <p className="opacity-80 font-normal">@{entry.room}</p>}
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            {showToast && <Toast message="Timetable updated successfully!" />}
        </div>
    );
};

export default Timetable;